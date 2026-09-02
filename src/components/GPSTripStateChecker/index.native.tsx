import {ModalActions} from '@components/Modal/Global/ModalContext';

import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';

import {resetGPSDraftDetails} from '@libs/actions/GPSDraftDetails';
import {getGpsPoints, stopGpsTrip} from '@libs/GPSDraftDetailsUtils';
import Navigation from '@libs/Navigation/Navigation';
import {generateReportID} from '@libs/ReportUtils';

import {BACKGROUND_LOCATION_TASK_OPTIONS, BACKGROUND_LOCATION_TRACKING_TASK_NAME} from '@pages/iou/request/step/IOURequestStepDistanceGPS/const';
import {checkAndCleanGpsNotification, startGpsTripNotification} from '@pages/iou/request/step/IOURequestStepDistanceGPS/GPSNotifications';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {useSplashScreenState} from '@src/SplashScreenStateContext';

import {accountIDSelector} from '@selectors/Session';
import {hasStartedLocationUpdatesAsync, startLocationUpdatesAsync, stopLocationUpdatesAsync} from 'expo-location';
import {useEffect, useEffectEvent, useRef, useState} from 'react';

import useUpdateGpsNotification from './useUpdateGpsNotification';
import useUpdateGpsTripOnReconnect from './useUpdateGpsTripOnReconnect';

function GPSTripStateChecker() {
    const {translate} = useLocalize();
    const [showContinueTripModal, setShowContinueTripModal] = useState(false);
    const [gpsDraftDetails, gpsDraftDetailsMetadata] = useOnyx(ONYXKEYS.GPS_DRAFT_DETAILS);
    const [currentAccountID, currentAccountIDResult] = useOnyx(ONYXKEYS.SESSION, {selector: accountIDSelector});
    const isSessionLoaded = currentAccountIDResult.status === 'loaded';
    const hasHandledAppRestart = useRef(false);
    const {isOffline} = useNetwork();
    const {showConfirmModal, closeModal} = useConfirmModal();
    const isContinueTripModalShownRef = useRef(false);
    const isAutoHidingContinueTripModalRef = useRef(false);

    const {splashScreenState} = useSplashScreenState();

    const reportID = gpsDraftDetails?.reportID ?? generateReportID();

    useUpdateGpsTripOnReconnect({gpsPoints: getGpsPoints(gpsDraftDetails)});
    useUpdateGpsNotification();

    // A trip started before this shipped records no accountID, so only a different one means another user.
    const isTripFromDifferentUser = isSessionLoaded && !!gpsDraftDetails?.accountID && gpsDraftDetails.accountID !== currentAccountID;

    useEffect(() => {
        if (!isTripFromDifferentUser) {
            return;
        }

        resetGPSDraftDetails();
        hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME).then((isRunning) => {
            if (!isRunning) {
                return;
            }

            stopLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME).catch((error) =>
                console.error('[GPS distance request] Failed to stop tracking for a trip from another user', error),
            );
        });
    }, [isTripFromDifferentUser]);

    useEffect(() => {
        // Wait for the GPS_DRAFT_DETAILS subscription to hydrate before running the restart check once, so we don't
        // misread the not-yet-loaded state as "no trip" and wrongly stop an in-progress trip's background task.
        if (gpsDraftDetailsMetadata.status !== 'loaded' || hasHandledAppRestart.current) {
            return;
        }
        hasHandledAppRestart.current = true;

        async function handleGpsTripInProgressOnAppRestart() {
            await checkAndCleanGpsNotification();

            if (!gpsDraftDetails?.isTracking) {
                const isBackgroundTaskRunning = await hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME);
                if (isBackgroundTaskRunning) {
                    stopLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME).catch((error) =>
                        console.error('[GPS distance request] Failed to stop orphaned location tracking', error),
                    );
                }
                return;
            }

            setShowContinueTripModal(true);
        }

        handleGpsTripInProgressOnAppRestart();
    }, [gpsDraftDetails?.isTracking, gpsDraftDetailsMetadata.status]);

    useEffect(() => {
        return () => {
            hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME).then((isRunning) => {
                if (!isRunning) {
                    return;
                }

                stopLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME).catch((error) => console.error('[GPS distance request] Failed to stop location tracking', error));
            });
        };
    }, []);

    const navigateToGpsScreen = () => {
        Navigation.navigate(ROUTES.DISTANCE_REQUEST_CREATE_TAB_GPS.getRoute(CONST.IOU.ACTION.CREATE, CONST.IOU.TYPE.CREATE, CONST.IOU.OPTIMISTIC_TRANSACTION_ID, reportID));
    };

    const continueGpsTrip = async () => {
        const isBackgroundTaskRunning = await hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME);

        const unit = gpsDraftDetails?.unit;

        if (isBackgroundTaskRunning) {
            if (unit) {
                startGpsTripNotification(translate, reportID, unit, gpsDraftDetails?.distanceInMeters);
            }
            return;
        }

        try {
            await startLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME, BACKGROUND_LOCATION_TASK_OPTIONS);
        } catch (error) {
            console.error('[GPS distance request] Failed to restart location tracking', error);
            return;
        }

        if (!unit) {
            return;
        }

        startGpsTripNotification(translate, reportID, unit, gpsDraftDetails?.distanceInMeters);
    };

    // The handlers run when the modal promise resolves, long after it was shown. They are effect events so
    // they read the latest gpsDraftDetails/isOffline — GPS points keep accumulating while the modal is open,
    // and stopping the trip with a show-time snapshot would submit a truncated set of points.
    const onContinueTrip = useEffectEvent(() => {
        setShowContinueTripModal(false);
        continueGpsTrip();
        navigateToGpsScreen();
    });

    const onViewTrip = useEffectEvent(() => {
        setShowContinueTripModal(false);
        stopGpsTrip(isOffline, getGpsPoints(gpsDraftDetails));
        navigateToGpsScreen();
    });

    const showContinueTripConfirmModal = useEffectEvent(() => {
        if (isContinueTripModalShownRef.current) {
            return;
        }
        isContinueTripModalShownRef.current = true;
        showConfirmModal({
            title: translate('gps.continueGpsTripModal.title'),
            prompt: translate('gps.continueGpsTripModal.prompt'),
            shouldReverseStackedButtons: true,
            confirmText: translate('gps.continueGpsTripModal.confirm'),
            cancelText: translate('gps.continueGpsTripModal.cancel'),
            // Cancelling this modal stops the trip, so Android hardware-back must not be routed into it.
            shouldHandleNavigationBack: false,
        }).then((result) => {
            isContinueTripModalShownRef.current = false;
            if (isAutoHidingContinueTripModalRef.current) {
                // The modal was hidden because a visibility condition went false, not by a user choice.
                // Leave showContinueTripModal set so the modal can re-show if the conditions hold again.
                isAutoHidingContinueTripModalRef.current = false;
                return;
            }
            if (result.action === ModalActions.CONFIRM) {
                onContinueTrip();
                return;
            }
            onViewTrip();
        });
    });

    const hideContinueTripConfirmModal = useEffectEvent(() => {
        // closeModal() pops whatever modal is on top, so only call it while our modal is up and unresolved.
        if (!isContinueTripModalShownRef.current) {
            return;
        }
        isAutoHidingContinueTripModalRef.current = true;
        closeModal();
    });

    // The old declarative modal derived its visibility from these conditions on every render, hiding itself
    // when tracking stops, the trip changes owner, or the splash screen is showing. Reproduce that here.
    const shouldShowContinueTripModal = showContinueTripModal && !!gpsDraftDetails?.isTracking && !isTripFromDifferentUser && splashScreenState === CONST.BOOT_SPLASH_STATE.HIDDEN;

    useEffect(() => {
        if (shouldShowContinueTripModal) {
            showContinueTripConfirmModal();
        } else {
            hideContinueTripConfirmModal();
        }
    }, [shouldShowContinueTripModal]);

    return null;
}

GPSTripStateChecker.displayName = 'GPSTripStateChecker';

export default GPSTripStateChecker;

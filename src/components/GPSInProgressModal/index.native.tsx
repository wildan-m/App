import {ModalActions} from '@components/Modal/Global/ModalContext';

import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';

import {closeReactNativeApp} from '@libs/actions/HybridApp';
import {setIsGPSInProgressModalOpen} from '@libs/actions/isGPSInProgressModalOpen';
import {getGpsPoints, stopGpsTrip} from '@libs/GPSDraftDetailsUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useEffectEvent, useRef} from 'react';

// The modal is triggered by an Onyx flag set from a non-React action (closeReactNativeApp), so this
// component stays mounted as a null-rendering controller that watches the flag and shows the global modal.
function GPSInProgressModal() {
    const [isGPSInProgressModalOpen] = useOnyx(ONYXKEYS.IS_GPS_IN_PROGRESS_MODAL_OPEN);
    const [gpsDraftDetails] = useOnyx(ONYXKEYS.GPS_DRAFT_DETAILS);
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {showConfirmModal} = useConfirmModal();
    const isModalShownRef = useRef(false);

    // GPS points keep accumulating into GPS_DRAFT_DETAILS while the modal is open, so the trip must be
    // stopped with the values from the latest render, not the ones captured when the modal was shown.
    const stopGpsAndSwitchToOD = useEffectEvent(async () => {
        await stopGpsTrip(isOffline, getGpsPoints(gpsDraftDetails));
        closeReactNativeApp({shouldSetNVP: true, isTrackingGPS: false, shouldIgnoreTryNewDotLoading: true});
    });

    const showInProgressModal = useEffectEvent(() => {
        if (isModalShownRef.current) {
            return;
        }
        isModalShownRef.current = true;
        showConfirmModal({
            title: translate('gps.switchToODWarningTripInProgress.title'),
            confirmText: translate('gps.switchToODWarningTripInProgress.confirm'),
            cancelText: translate('common.cancel'),
            prompt: translate('gps.switchToODWarningTripInProgress.prompt'),
            buttonVariant: CONST.BUTTON_VARIANT.DANGER,
        }).then((result) => {
            isModalShownRef.current = false;
            setIsGPSInProgressModalOpen(false);
            if (result.action !== ModalActions.CONFIRM) {
                return;
            }
            return stopGpsAndSwitchToOD();
        });
    });

    useEffect(() => {
        if (!isGPSInProgressModalOpen) {
            return;
        }
        showInProgressModal();
    }, [isGPSInProgressModalOpen]);

    return null;
}

GPSInProgressModal.displayName = 'GPSInProgressModal';

export default GPSInProgressModal;

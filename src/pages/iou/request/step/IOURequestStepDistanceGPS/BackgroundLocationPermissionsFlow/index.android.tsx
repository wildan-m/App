import {getBackgroundPermissionsAsync, getForegroundPermissionsAsync, PermissionStatus, requestBackgroundPermissionsAsync, requestForegroundPermissionsAsync} from 'expo-location';
import React, {useEffect, useState} from 'react';
import {Linking} from 'react-native';
import ConfirmModal from '@components/ConfirmModal';
import {loadIllustration} from '@components/Icon/IllustrationLoader';
import {useMemoizedLazyAsset} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import type BackgroundLocationPermissionsFlowProps from './types';

async function requestForegroundPermissions({
    onSuccess,
    onError,
    onPreciseLocationNotGranted,
}: {
    onSuccess: () => Promise<void>;
    onPreciseLocationNotGranted: () => void;
    onError: () => void;
}) {
    try {
        const {status, android} = await requestForegroundPermissionsAsync();

        if (status === PermissionStatus.GRANTED && android?.accuracy === 'fine') {
            await onSuccess();
        }

        if (android?.accuracy !== 'fine') {
            onPreciseLocationNotGranted();
        }
    } catch (e) {
        console.error('[GPS distance request] Failed to request foreground location permissions: ', e);
        onError();
    }
}

async function requestBackgroundPermissions(onGrant: () => void, onError: () => void) {
    try {
        const {status} = await requestBackgroundPermissionsAsync();

        if (status === PermissionStatus.GRANTED) {
            onGrant();
        }
    } catch (e) {
        console.error('[GPS distance request] Failed to request background location permissions: ', e);
        onError();
    }
}

async function checkPermissions({
    onGrant,
    onAskForPermissions,
    onShowSettings,
    onError,
}: Pick<BackgroundLocationPermissionsFlowProps, 'onGrant'> & {onAskForPermissions: () => void; onShowSettings: (type: 'location' | 'background') => void; onError: () => void}) {
    try {
        const {granted, canAskAgain, android} = await getForegroundPermissionsAsync();

        if ((!granted || android?.accuracy !== 'fine') && !canAskAgain) {
            onShowSettings('location');
            return;
        }

        const {granted: bgGranted, canAskAgain: bgCanAskAgain} = await getBackgroundPermissionsAsync();

        if (!bgGranted && !bgCanAskAgain) {
            onShowSettings('background');
            return;
        }

        if (granted && bgGranted && android?.accuracy === 'fine') {
            onGrant();
            return;
        }

        onAskForPermissions();
    } catch (e) {
        console.error('[GPS distance request] Failed to get location permissions: ', e);
        onError();
    }
}

function BackgroundLocationPermissionsFlow({startPermissionsFlow, setStartPermissionsFlow, onGrant, onDeny, onError}: BackgroundLocationPermissionsFlowProps) {
    const [showFirstAskModal, setShowFirstAskModal] = useState(false);
    const [showBgPermissionsModal, setShowBgPermissionsModal] = useState(false);
    const [showPreciseLocationModal, setShowPreciseLocationModal] = useState(false);
    const [settingsModalType, setSettingsModalType] = useState<'location' | 'background' | null>(null);
    const {asset: ReceiptLocationMarker} = useMemoizedLazyAsset(() => loadIllustration('ReceiptLocationMarker'));
    const {translate} = useLocalize();

    const onForegroundPermissionsGranted = async () => {
        const {granted} = await getBackgroundPermissionsAsync();

        // possible when foreground location permissions request was to grant precise location and
        // bg permissions were already granted
        if (granted) {
            onGrant();
            return;
        }

        setShowBgPermissionsModal(true);
    };

    useEffect(() => {
        if (!startPermissionsFlow) {
            return;
        }

        checkPermissions({onGrant, onError, onAskForPermissions: () => setShowFirstAskModal(true), onShowSettings: (type) => setSettingsModalType(type)});
        setStartPermissionsFlow(false);
    }, [startPermissionsFlow, onGrant, setStartPermissionsFlow, onError]);

    return (
        <>
            <ConfirmModal
                isVisible={showFirstAskModal}
                title={translate('gps.locationRequiredModal.title')}
                onCancel={() => setShowFirstAskModal(false)}
                onConfirm={() => {
                    setShowFirstAskModal(false);
                    requestForegroundPermissions({onSuccess: onForegroundPermissionsGranted, onError, onPreciseLocationNotGranted: () => setShowPreciseLocationModal(true)});
                }}
                confirmText={translate('gps.locationRequiredModal.allow')}
                cancelText={translate('common.dismiss')}
                prompt={translate('gps.locationRequiredModal.prompt')}
                iconSource={ReceiptLocationMarker}
                iconFill={false}
                iconWidth={140}
                iconHeight={120}
                shouldCenterIcon
                shouldReverseStackedButtons
            />
            <ConfirmModal
                isVisible={showBgPermissionsModal}
                title={translate('gps.androidBackgroundLocationRequiredModal.title')}
                onCancel={() => setShowBgPermissionsModal(false)}
                onConfirm={() => {
                    setShowBgPermissionsModal(false);
                    requestBackgroundPermissions(onGrant, onError);
                }}
                confirmText={translate('common.settings')}
                cancelText={translate('common.dismiss')}
                prompt={translate('gps.androidBackgroundLocationRequiredModal.prompt')}
                iconSource={ReceiptLocationMarker}
                iconFill={false}
                iconWidth={140}
                iconHeight={120}
                shouldCenterIcon
                shouldReverseStackedButtons
            />
            <ConfirmModal
                title={translate('gps.preciseLocationRequiredModal.title')}
                isVisible={showPreciseLocationModal}
                onConfirm={() => {
                    setShowPreciseLocationModal(false);
                    Linking.openSettings();
                }}
                onCancel={() => setShowPreciseLocationModal(false)}
                confirmText={translate('common.settings')}
                cancelText={translate('common.dismiss')}
                prompt={translate('gps.preciseLocationRequiredModal.prompt')}
                iconSource={ReceiptLocationMarker}
                iconFill={false}
                iconWidth={140}
                iconHeight={120}
                shouldCenterIcon
                shouldReverseStackedButtons
            />
            <ConfirmModal
                isVisible={settingsModalType !== null}
                title={translate(settingsModalType === 'background' ? 'gps.androidBackgroundLocationRequiredModal.title' : 'gps.locationRequiredModal.title')}
                prompt={translate(settingsModalType === 'background' ? 'gps.androidBackgroundLocationRequiredModal.prompt' : 'gps.locationRequiredModal.prompt')}
                onConfirm={() => {
                    setSettingsModalType(null);
                    Linking.openSettings();
                }}
                onCancel={() => {
                    setSettingsModalType(null);
                    onDeny();
                }}
                confirmText={translate('common.settings')}
                cancelText={translate('common.dismiss')}
                iconSource={ReceiptLocationMarker}
                iconFill={false}
                iconWidth={140}
                iconHeight={120}
                shouldCenterIcon
                shouldReverseStackedButtons
            />
        </>
    );
}

export default BackgroundLocationPermissionsFlow;

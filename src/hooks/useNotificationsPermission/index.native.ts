import Airship, {PermissionStatus} from '@ua/react-native-airship';
import {useCallback, useEffect, useState} from 'react';
import type {NotificationsPermission} from './index';

function useNotificationsPermission(): NotificationsPermission {
    const [state, setState] = useState<{isEnabled: boolean; isPromptable: boolean}>({isEnabled: true, isPromptable: false});

    useEffect(() => {
        let isMounted = true;
        Airship.push
            .getNotificationStatus()
            .then(({notificationPermissionStatus}) => {
                if (!isMounted) {
                    return;
                }
                setState({
                    isEnabled: notificationPermissionStatus === PermissionStatus.Granted,
                    isPromptable: notificationPermissionStatus === PermissionStatus.NotDetermined,
                });
            })
            .catch(() => {
                if (!isMounted) {
                    return;
                }
                // If we can't read the status, hide the banner rather than show a banner that
                // won't work when tapped.
                setState({isEnabled: true, isPromptable: false});
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const requestPermission = useCallback(
        () =>
            Airship.push
                .enableUserNotifications()
                .then((isEnabled) => {
                    setState({isEnabled, isPromptable: false});
                    return isEnabled;
                })
                .catch(() => false),
        [],
    );

    return {isEnabled: state.isEnabled, isPromptable: state.isPromptable, requestPermission};
}

export default useNotificationsPermission;

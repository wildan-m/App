import {useCallback, useEffect, useState} from 'react';

type NotificationsPermission = {
    isEnabled: boolean;
    isPromptable: boolean;
    requestPermission: () => Promise<boolean>;
};

function readWebStatus() {
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
        return {isEnabled: true, isPromptable: false};
    }
    return {
        isEnabled: window.Notification.permission === 'granted',
        isPromptable: window.Notification.permission === 'default',
    };
}

function useNotificationsPermission(): NotificationsPermission {
    const [state, setState] = useState(readWebStatus);

    useEffect(() => {
        // Refresh after mount in case the permission changed since the previous render
        // (e.g. user accepted/denied the prompt in another tab).
        setState(readWebStatus());
    }, []);

    const requestPermission = useCallback(() => {
        if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
            return Promise.resolve(false);
        }
        return window.Notification.requestPermission().then((status) => {
            const granted = status === 'granted';
            setState({isEnabled: granted, isPromptable: status === 'default'});
            return granted;
        });
    }, []);

    return {isEnabled: state.isEnabled, isPromptable: state.isPromptable, requestPermission};
}

export default useNotificationsPermission;
export type {NotificationsPermission};

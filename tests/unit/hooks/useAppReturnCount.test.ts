import {act, renderHook} from '@testing-library/react-native';

import useAppReturnCount from '@hooks/useAppReturnCount';

import type {AppStateStatus} from 'react-native';

import {AppState, Platform} from 'react-native';

const mockedAddEventListener = jest.spyOn(AppState, 'addEventListener');

function getListener(type: string) {
    return mockedAddEventListener.mock.calls.findLast(([eventType]) => eventType === type)?.[1];
}

function emitAppState(nextAppState: AppStateStatus) {
    const callback = getListener('change');
    act(() => callback?.(nextAppState));
}

function emitWindowBlur() {
    const callback = getListener('blur');
    act(() => callback?.('background'));
}

describe('useAppReturnCount', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
        Platform.OS = originalOS;
    });

    beforeEach(() => {
        mockedAddEventListener.mockClear();
        mockedAddEventListener.mockImplementation(() => ({remove: jest.fn()}) as ReturnType<typeof AppState.addEventListener>);
    });

    it('starts at zero', () => {
        // Given a freshly mounted hook

        // When nothing has happened yet
        const {result} = renderHook(() => useAppReturnCount());

        // Then there is nothing to refresh for
        expect(result.current).toBe(0);
    });

    it('counts a return from the background', () => {
        // Given a mounted hook
        const {result} = renderHook(() => useAppReturnCount());

        // When the app is backgrounded and then reopened
        emitAppState('background');
        emitAppState('active');

        // Then that counts as one return
        expect(result.current).toBe(1);
    });

    it('ignores a transient interruption that never reached the background', () => {
        // Given a mounted hook
        const {result} = renderHook(() => useAppReturnCount());

        // When iOS reports `inactive` and then `active`, like Control Center or a permission dialog
        emitAppState('inactive');
        emitAppState('active');

        // Then the app never left, so nothing is refetched
        expect(result.current).toBe(0);
    });

    it('counts a background trip that passes through inactive', () => {
        // Given a mounted hook
        const {result} = renderHook(() => useAppReturnCount());

        // When the app follows the real iOS sequence for leaving and coming back
        emitAppState('inactive');
        emitAppState('background');
        emitAppState('inactive');
        emitAppState('active');

        // Then it is counted once, not once per transition
        expect(result.current).toBe(1);
    });

    it('counts each separate return', () => {
        // Given a mounted hook
        const {result} = renderHook(() => useAppReturnCount());

        // When the user leaves and comes back twice
        emitAppState('background');
        emitAppState('active');
        emitAppState('background');
        emitAppState('active');

        // Then both returns are reported, so a stale screen refreshes each time
        expect(result.current).toBe(2);
    });

    it('counts an Android return that never reported the background', () => {
        // Given a mounted hook on Android
        Platform.OS = 'android';
        const {result} = renderHook(() => useAppReturnCount());

        // When the window loses focus on the way out and the app comes back `active` without a `background` change, as on the HybridApp
        emitWindowBlur();
        emitAppState('active');

        // Then that still counts as one return, so the Home cards refresh
        expect(result.current).toBe(1);
    });

    it('does not count an Android window blur on its own', () => {
        // Given a mounted hook on Android
        Platform.OS = 'android';
        const {result} = renderHook(() => useAppReturnCount());

        // When a dialog takes window focus but the app never pauses and resumes
        emitWindowBlur();

        // Then nothing is counted until the app actually comes back `active`
        expect(result.current).toBe(0);
    });

    it('counts an Android return once when both blur and background are reported', () => {
        // Given a mounted hook on Android
        Platform.OS = 'android';
        const {result} = renderHook(() => useAppReturnCount());

        // When a standalone build reports both the window blur and the `background` change before resuming
        emitWindowBlur();
        emitAppState('background');
        emitAppState('active');

        // Then it is a single return, not two
        expect(result.current).toBe(1);
    });

    it('does not listen for window blur on iOS', () => {
        // Given the default iOS platform

        // When the hook mounts
        renderHook(() => useAppReturnCount());

        // Then only the `change` listener is added, so the Control Center guard is untouched
        expect(getListener('blur')).toBeUndefined();
    });
});

import {act, renderHook} from '@testing-library/react-native';

import SidePanelContextProvider from '@components/SidePanel/SidePanelContextProvider';

import useSidePanelDisplayStatus from '@hooks/useSidePanelDisplayStatus';
import useSidePanelState from '@hooks/useSidePanelState';

import {ConciergeChatHistoryProvider, useConciergeChatHistoryActions, useConciergeChatHistoryState} from '@pages/inbox/ConciergeChatHistoryContext';

import ONYXKEYS from '@src/ONYXKEYS';

import type {PropsWithChildren} from 'react';

import React from 'react';
// The provider animates with Animated from 'react-native', so the test has to reach for the same module to drive it.
// eslint-disable-next-line no-restricted-imports
import {Animated} from 'react-native';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

jest.mock('@hooks/useSidePanelDisplayStatus');

const mockUseSidePanelDisplayStatus = jest.mocked(useSidePanelDisplayStatus);

/** Drives the only input the provider's history reset reacts to, so the test needs no navigator and no viewport. */
function setSidePanelHidden(shouldHideSidePanel: boolean) {
    mockUseSidePanelDisplayStatus.mockReturnValue({
        sidePanelNVP: {open: !shouldHideSidePanel, openNarrowScreen: false, forceConcierge: false},
        shouldHideSidePanel,
        isSidePanelHiddenOrLargeScreen: shouldHideSidePanel,
        shouldHideHelpButton: !shouldHideSidePanel,
        shouldHideSidePanelBackdrop: true,
    });
}

/**
 * Stands in for the slide animation. Under Jest the native driver never completes on its own, so the test holds the
 * end callback and fires it by hand. That is the only way to observe the window where the panel is still mounted.
 */
function mockSlideAnimation() {
    let latestEndCallback: ((result: {finished: boolean}) => void) | undefined;
    const realParallel = Animated.parallel;
    jest.spyOn(Animated, 'parallel').mockImplementation((animations) => {
        const composite = realParallel(animations);
        composite.start = (callback?: (result: {finished: boolean}) => void) => {
            latestEndCallback = callback;
        };
        return composite;
    });

    /**
     * Hands back a completer bound to the animation that started most recently, so a later animation cannot steal it.
     * An interrupted close reports back only after the reopen has registered its own callback, so the test has to
     * capture the close callback while it is still the latest one.
     */
    return function takeLatestSlide() {
        const endCallback = latestEndCallback;
        if (!endCallback) {
            throw new Error('No slide animation has started, so there is no end callback to complete.');
        }
        return (finished: boolean) =>
            act(() => {
                endCallback({finished});
            });
    };
}

function wrapper({children}: PropsWithChildren) {
    return (
        <ConciergeChatHistoryProvider>
            <SidePanelContextProvider>{children}</SidePanelContextProvider>
        </ConciergeChatHistoryProvider>
    );
}

function useSidePanelConciergeHistory() {
    return {
        sidePanelState: useSidePanelState(),
        sidePanelHistory: useConciergeChatHistoryState(true),
        inboxHistory: useConciergeChatHistoryState(false),
        sidePanelHistoryActions: useConciergeChatHistoryActions(true),
        inboxHistoryActions: useConciergeChatHistoryActions(false),
    };
}

describe('SidePanelContextProvider (Concierge history in the side panel)', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
        jest.restoreAllMocks();
        setSidePanelHidden(true);
    });

    it('keeps the history shown for the whole close animation, then collapses it once the panel unmounts', () => {
        // Given an open Side Panel where the user expanded the Concierge chat history
        const takeLatestSlide = mockSlideAnimation();
        const {result, rerender} = renderHook(() => useSidePanelConciergeHistory(), {wrapper});
        setSidePanelHidden(false);
        rerender({});
        takeLatestSlide()(true);
        act(() => result.current.sidePanelHistoryActions.setShowFullHistory(true));
        expect(result.current.sidePanelHistory.showFullHistory).toBe(true);

        // When the panel starts closing
        setSidePanelHidden(true);
        rerender({});
        const finishClose = takeLatestSlide();

        // Then the history stays shown while the panel is still mounted and sliding out, so the welcome screen doesn't flash in
        expect(result.current.sidePanelState.isSidePanelTransitionEnded).toBe(false);
        expect(result.current.sidePanelHistory.showFullHistory).toBe(true);

        // And it collapses once the animation completes, so the next open starts on the welcome screen
        finishClose(true);
        expect(result.current.sidePanelState.isSidePanelTransitionEnded).toBe(true);
        expect(result.current.sidePanelHistory).toEqual({showFullHistory: false, isHistoryCollapsedByUser: false});
    });

    it('does not let an interrupted close collapse the history when the panel is reopened mid-animation', () => {
        // Given an open Side Panel where the user expanded the Concierge chat history
        const takeLatestSlide = mockSlideAnimation();
        const {result, rerender} = renderHook(() => useSidePanelConciergeHistory(), {wrapper});
        setSidePanelHidden(false);
        rerender({});
        takeLatestSlide()(true);
        act(() => result.current.sidePanelHistoryActions.setShowFullHistory(true));

        // When the panel is closed, its close callback is captured, and the panel is reopened before that close
        // animation gets to finish. Capturing it first is what keeps the reopen from taking its place.
        setSidePanelHidden(true);
        rerender({});
        const finishInterruptedClose = takeLatestSlide();
        setSidePanelHidden(false);
        rerender({});

        // Then the superseded close reports back unfinished and leaves the reopened panel's history alone
        finishInterruptedClose(false);
        expect(result.current.sidePanelHistory.showFullHistory).toBe(true);
    });

    it('keeps the Inbox and the side panel history apart', () => {
        // Given the Concierge chat open both in the Inbox and in the Side Panel, as it can be on wide screens
        const takeLatestSlide = mockSlideAnimation();
        const {result, rerender} = renderHook(() => useSidePanelConciergeHistory(), {wrapper});
        setSidePanelHidden(false);
        rerender({});
        takeLatestSlide()(true);

        // When the user expands the history in the Inbox
        act(() => result.current.inboxHistoryActions.setShowFullHistory(true));

        // Then the Side Panel keeps showing the welcome screen
        expect(result.current.inboxHistory.showFullHistory).toBe(true);
        expect(result.current.sidePanelHistory.showFullHistory).toBe(false);

        // And closing the Side Panel leaves the Inbox history expanded
        setSidePanelHidden(true);
        rerender({});
        takeLatestSlide()(true);
        expect(result.current.inboxHistory.showFullHistory).toBe(true);
    });
});

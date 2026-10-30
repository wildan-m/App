import useIsInSidePanel from '@hooks/useIsInSidePanel';
import useOnyx from '@hooks/useOnyx';

import {readNewestAction} from '@userActions/Report';

import ONYXKEYS from '@src/ONYXKEYS';

import type {PropsWithChildren} from 'react';

import {accountIDSelector} from '@selectors/Session';
import React, {createContext, useContext, useState} from 'react';

type ConciergeChatHistoryStateContextType = {
    /** Whether the Concierge chat shows its earlier conversation instead of the welcome screen */
    showFullHistory: boolean;

    /** Whether the user collapsed the earlier conversation */
    isHistoryCollapsedByUser: boolean;
};

type ConciergeChatHistoryActionsContextType = {
    setShowFullHistory: (show: boolean) => void;

    /** Hides the earlier conversation and marks the Concierge chat as read */
    collapseHistory: () => void;

    /** Returns the history to its initial state, e.g. when the side panel closes */
    resetHistory: () => void;
};

/**
 * The Concierge chat can be open in the Inbox and in the side panel at the same time on wide screens,
 * so each surface keeps its own history state.
 */
type ConciergeChatHistorySurfacesState = {
    inbox: ConciergeChatHistoryStateContextType;
    sidePanel: ConciergeChatHistoryStateContextType;
};

type ConciergeChatHistorySurface = keyof ConciergeChatHistorySurfacesState;

type ConciergeChatHistorySurfacesActions = {
    setShowFullHistory: (surface: ConciergeChatHistorySurface, show: boolean) => void;
    collapseHistory: (surface: ConciergeChatHistorySurface) => void;
    resetHistory: (surface: ConciergeChatHistorySurface) => void;
};

const INITIAL_HISTORY_STATE: ConciergeChatHistoryStateContextType = {
    showFullHistory: false,
    isHistoryCollapsedByUser: false,
};

const ConciergeChatHistoryStateContext = createContext<ConciergeChatHistorySurfacesState>({
    inbox: INITIAL_HISTORY_STATE,
    sidePanel: INITIAL_HISTORY_STATE,
});

const ConciergeChatHistoryActionsContext = createContext<ConciergeChatHistorySurfacesActions>({
    setShowFullHistory: () => {},
    collapseHistory: () => {},
    resetHistory: () => {},
});

function ConciergeChatHistoryProvider({children}: PropsWithChildren) {
    const [historyState, setHistoryState] = useState<ConciergeChatHistorySurfacesState>({inbox: INITIAL_HISTORY_STATE, sidePanel: INITIAL_HISTORY_STATE});

    const setShowFullHistory = (surface: ConciergeChatHistorySurface, show: boolean) => {
        setHistoryState((prev) => ({...prev, [surface]: {showFullHistory: show, isHistoryCollapsedByUser: !show}}));
    };

    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const collapseHistory = (surface: ConciergeChatHistorySurface) => {
        setShowFullHistory(surface, false);
        readNewestAction(conciergeReportID, true);
    };

    const resetHistory = (surface: ConciergeChatHistorySurface) => {
        setHistoryState((prev) => (prev[surface] === INITIAL_HISTORY_STATE ? prev : {...prev, [surface]: INITIAL_HISTORY_STATE}));
    };

    // Collapse the history when the user switches accounts.
    const [accountID] = useOnyx(ONYXKEYS.SESSION, {selector: accountIDSelector});
    const [prevAccountID, setPrevAccountID] = useState(accountID);
    if (prevAccountID !== accountID) {
        setPrevAccountID(accountID);
        setHistoryState({inbox: INITIAL_HISTORY_STATE, sidePanel: INITIAL_HISTORY_STATE});
    }

    const actionsValue = {setShowFullHistory, collapseHistory, resetHistory};

    return (
        <ConciergeChatHistoryStateContext.Provider value={historyState}>
            <ConciergeChatHistoryActionsContext.Provider value={actionsValue}>{children}</ConciergeChatHistoryActionsContext.Provider>
        </ConciergeChatHistoryStateContext.Provider>
    );
}

/**
 * Picks the surface the caller renders in. Pass `isInSidePanel` to target a surface from outside of it,
 * e.g. the search router asking Concierge in the side panel.
 */
function useConciergeChatHistorySurface(isInSidePanel?: boolean): ConciergeChatHistorySurface {
    const isRenderedInSidePanel = useIsInSidePanel();
    return (isInSidePanel ?? isRenderedInSidePanel) ? 'sidePanel' : 'inbox';
}

function useConciergeChatHistoryState(isInSidePanel?: boolean): ConciergeChatHistoryStateContextType {
    const surface = useConciergeChatHistorySurface(isInSidePanel);
    return useContext(ConciergeChatHistoryStateContext)[surface];
}

function useConciergeChatHistoryActions(isInSidePanel?: boolean): ConciergeChatHistoryActionsContextType {
    const surface = useConciergeChatHistorySurface(isInSidePanel);
    const actions = useContext(ConciergeChatHistoryActionsContext);

    return {
        setShowFullHistory: (show: boolean) => actions.setShowFullHistory(surface, show),
        collapseHistory: () => actions.collapseHistory(surface),
        resetHistory: () => actions.resetHistory(surface),
    };
}

export {ConciergeChatHistoryProvider, useConciergeChatHistoryActions, useConciergeChatHistoryState};

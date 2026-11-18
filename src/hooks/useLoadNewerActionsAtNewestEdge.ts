import ONYXKEYS from '@src/ONYXKEYS';
import {isLoadingNewerReportActionsSelector} from '@src/selectors/ReportMetaData';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useEffectEvent, useRef} from 'react';

import {useIsReportLoadPending} from './useInFlightRequests';
import useNetwork from './useNetwork';
import useOnyx from './useOnyx';

type UseLoadNewerActionsAtNewestEdgeParams = {
    /** The id of the current report */
    reportID: string;

    /** If the report has newer actions to load */
    hasNewerActions: boolean;

    /** Whether the list is resting at its newest edge, where `onStartReached` would load the next newer page */
    isAtNewestEdge: boolean;

    /** The cursor `loadNewerChats` sends; it only changes when a newer page lands */
    newerActionsCursorID: string | undefined;

    /** Fetches the page of actions newer than the current chain and returns whether a request was sent */
    loadNewerChats: (force?: boolean) => boolean;
};

/**
 * Loads newer chats while the list sits at its newest edge and the chain still has newer actions.
 *
 * `onStartReached` only fires when the scroll position crosses into the newest edge, and `loadNewerChats` ignores
 * it while the report is unfocused, offline, or before OpenReport has cleared a cached "synced to newest" marker.
 * A crossing swallowed that way never repeats, so a list opened at the oldest unread message could stay short of
 * the newest message with nothing left to fetch it. This re-requests whenever those inputs change, once per cursor,
 * so a response that doesn't advance the cursor can't loop.
 */
function useLoadNewerActionsAtNewestEdge({reportID, hasNewerActions, isAtNewestEdge, newerActionsCursorID, loadNewerChats}: UseLoadNewerActionsAtNewestEdgeParams) {
    const {isOffline} = useNetwork();
    const isFocused = useIsFocused();
    const isReportLoadPending = useIsReportLoadPending(reportID);
    const [isLoadingNewerReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE}${reportID}`, {
        selector: isLoadingNewerReportActionsSelector,
    });
    const lastRequestedCursorRef = useRef<string | undefined>(undefined);

    /** Loads newer chats and records the cursor once a request is actually sent, so the effect doesn't repeat it. */
    const requestNewerChats = () => {
        if (!loadNewerChats(false)) {
            return;
        }
        lastRequestedCursorRef.current = newerActionsCursorID;
    };

    // Scrolling into the edge already fires onStartReached, so the edge position is read without re-running on it.
    const loadNewerChatsIfAtNewestEdge = useEffectEvent(() => {
        if (!isAtNewestEdge) {
            return;
        }
        requestNewerChats();
    });

    useEffect(() => {
        if (!isFocused || !hasNewerActions || isOffline || isReportLoadPending || isLoadingNewerReportActions) {
            return;
        }

        if (!newerActionsCursorID || lastRequestedCursorRef.current === newerActionsCursorID) {
            return;
        }

        loadNewerChatsIfAtNewestEdge();
    }, [isFocused, hasNewerActions, isOffline, isReportLoadPending, isLoadingNewerReportActions, newerActionsCursorID]);

    return requestNewerChats;
}

export default useLoadNewerActionsAtNewestEdge;

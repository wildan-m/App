import {useCurrentReportIDState} from '@hooks/useCurrentReportID';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';

import AppStateMonitor from '@libs/AppStateMonitor';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import getUnreadReportsForUnreadIndicator from '@libs/UnreadIndicatorUpdater/getUnreadReportsForUnreadIndicator';
import updateUnread, {setUnreadUpdateCallback} from '@libs/UnreadIndicatorUpdater/updateUnread';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useRef} from 'react';

/**
 * Renders nothing: keeps the unread indicator (browser tab title on web, app icon badge on iOS) in sync.
 * Reading through useOnyx instead of module-level subscriptions lets React Compiler hold exactly one
 * memoized count that is redone only when an input changes, so no stale copies of the reports collection
 * accumulate and the per-update cost stays flat for the whole session.
 */
function UnreadIndicatorUpdater() {
    const [reports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [reportNameValuePairs] = useOnyx(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS);
    const [reportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [reportAttributes] = useOnyx(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES);
    const {currentReportID} = useCurrentReportIDState();
    // Member-key subscription so this component only wakes for the current report's draft, not for every draft in the collection.
    const [draftComment] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${getNonEmptyStringOnyxID(currentReportID)}`);
    const {isOffline} = useNetwork();

    const unreadReportIDs = getUnreadReportsForUnreadIndicator({
        reports,
        currentReportID,
        draftComment,
        reportNameValuePairs,
        reportActions,
        reportAttributes: reportAttributes?.reports,
        currentUserAccountID: session?.accountID ?? CONST.DEFAULT_NUMBER_ID,
        currentUserLogin: session?.email ?? '',
        conciergeReportID,
        isOffline,
    })
        .map((report) => report?.reportID)
        .filter((reportID): reportID is string => !!reportID);

    const latestUnreadReportIDsRef = useRef<string[]>([]);

    useEffect(() => {
        latestUnreadReportIDsRef.current = unreadReportIDs;
        updateUnread(unreadReportIDs.length, unreadReportIDs);
    }, [unreadReportIDs]);

    useEffect(() => {
        // The Concierge response indicator asks for the latest snapshot to be committed again when a requested
        // reply completes, and returning to the foreground re-applies it so the iOS badge stays fresh.
        const commitLatestSnapshot = () => updateUnread(latestUnreadReportIDsRef.current.length, latestUnreadReportIDsRef.current);
        setUnreadUpdateCallback(commitLatestSnapshot);
        const removeBecameActiveListener = AppStateMonitor.addBecameActiveListener(commitLatestSnapshot);
        return () => {
            setUnreadUpdateCallback(undefined);
            removeBecameActiveListener();
        };
    }, []);

    return null;
}

export default UnreadIndicatorUpdater;

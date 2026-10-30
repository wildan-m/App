import ONYXKEYS from '@src/ONYXKEYS';

import useOnyx from './useOnyx';

/**
 * Returns true when thinking/typing indicators should be hidden: in the Concierge chat (in the Inbox and in the
 * side panel alike), where Concierge answers in a thread, and while a followup list is pending.
 */
function useShouldSuppressConciergeIndicators(reportID: string | undefined): boolean {
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [pendingFollowupList] = useOnyx(`${ONYXKEYS.COLLECTION.CONCIERGE_PENDING_FOLLOWUP_LIST}${reportID}`);

    if (pendingFollowupList) {
        return true;
    }

    return reportID === conciergeReportID;
}

export default useShouldSuppressConciergeIndicators;

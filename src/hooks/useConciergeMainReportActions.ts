import {useCallback, useMemo, useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {isCreatedAction} from '@libs/ReportActionsUtils';
import {buildConciergeGreetingReportAction} from '@libs/ReportUtils';
import type * as OnyxTypes from '@src/types/onyx';

type UseConciergeMainReportActionsParams = {
    report: OnyxEntry<OnyxTypes.Report>;
    reportActions: OnyxTypes.ReportAction[];
    visibleReportActions: OnyxTypes.ReportAction[];
    isConciergeMainDM: boolean;
    hasOlderActions: boolean;
    greetingText: string;
    loadOlderChats: (force?: boolean) => void;
};

function useConciergeMainReportActions({report, reportActions, visibleReportActions, isConciergeMainDM, hasOlderActions, greetingText, loadOlderChats}: UseConciergeMainReportActionsParams) {
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [openBoundaryTime, setOpenBoundaryTime] = useState<string | null>(null);
    const [prevReportKey, setPrevReportKey] = useState<string | null>(null);

    // Null when we're not in main-Concierge mode, otherwise the reportID.
    // Lets the hook distinguish "entered a new concierge report" from
    // "report prop updated in place" and reset the snapshot accordingly.
    const reportKey = isConciergeMainDM ? (report?.reportID ?? null) : null;
    const currentLastReadTime = report?.lastReadTime;

    if (prevReportKey !== reportKey) {
        setPrevReportKey(reportKey);
        setShowFullHistory(false);
        // Freeze lastReadTime at entry — it advances during the session as
        // the open marks messages read, which would drift the boundary.
        // If lastReadTime isn't available yet (report still loading), leave
        // null and the follow-up branch below captures it on a later render.
        setOpenBoundaryTime(reportKey && currentLastReadTime ? currentLastReadTime : null);
    } else if (reportKey && openBoundaryTime === null && currentLastReadTime) {
        setOpenBoundaryTime(currentLastReadTime);
    }

    const hasReadMessages = useMemo(() => {
        if (!isConciergeMainDM || !openBoundaryTime) {
            return false;
        }
        const hasReadInLoadedSet = visibleReportActions.some((action) => !isCreatedAction(action) && action.created <= openBoundaryTime);
        // Older unloaded history is older than anything visible, so it is
        // all on the read side of the boundary by construction.
        return hasReadInLoadedSet || hasOlderActions;
    }, [isConciergeMainDM, visibleReportActions, openBoundaryTime, hasOlderActions]);

    const hasUnreadMessages = useMemo(() => {
        if (!isConciergeMainDM || !openBoundaryTime) {
            return false;
        }
        return visibleReportActions.some((action) => !isCreatedAction(action) && action.created > openBoundaryTime);
    }, [isConciergeMainDM, visibleReportActions, openBoundaryTime]);

    const showEphemeralGreeting = isConciergeMainDM && !showFullHistory && hasReadMessages && !hasUnreadMessages;

    const conciergeGreetingAction = useMemo(() => {
        if (!showEphemeralGreeting || !openBoundaryTime) {
            return undefined;
        }
        return buildConciergeGreetingReportAction({reportID: report?.reportID, greetingText, created: openBoundaryTime});
    }, [showEphemeralGreeting, openBoundaryTime, report?.reportID, greetingText]);

    const filterActions = useCallback(
        (actions: OnyxTypes.ReportAction[]): OnyxTypes.ReportAction[] => {
            if (!isConciergeMainDM || showFullHistory || !openBoundaryTime) {
                return actions;
            }
            if (showEphemeralGreeting && conciergeGreetingAction) {
                const createdAction = actions.find(isCreatedAction);
                return createdAction ? [conciergeGreetingAction, createdAction] : [conciergeGreetingAction];
            }
            return actions.filter((action) => isCreatedAction(action) || action.created > openBoundaryTime);
        },
        [isConciergeMainDM, showFullHistory, openBoundaryTime, showEphemeralGreeting, conciergeGreetingAction],
    );

    const filteredVisibleActions = useMemo(() => filterActions(visibleReportActions), [filterActions, visibleReportActions]);
    const filteredReportActions = useMemo(() => filterActions(reportActions), [filterActions, reportActions]);

    const handleShowPreviousMessages = useCallback(() => {
        setShowFullHistory(true);
        loadOlderChats(true);
    }, [loadOlderChats]);

    return {
        filteredVisibleActions,
        filteredReportActions,
        showFullHistory,
        hasPreviousMessages: hasReadMessages,
        handleShowPreviousMessages,
    };
}

export default useConciergeMainReportActions;

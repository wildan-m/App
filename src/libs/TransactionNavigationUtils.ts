import CONST from '@src/CONST';
import type {OnyxInputOrEntry, Report, ReportAction, ReportLoadingState} from '@src/types/onyx';

import {isDeletedAction} from './ReportActionsUtils';

type ParentReportActionDeletionStatusParams = {
    hasLoadedParentReportActions?: boolean;
    isOffline?: boolean;
    parentReportAction: OnyxInputOrEntry<ReportAction>;
    parentReportActionID?: string;
    parentReportID?: string;
    parentReportLoadingState?: OnyxInputOrEntry<ReportLoadingState>;
    shouldRequireParentReportActionID?: boolean;
    shouldTreatMissingParentReportAsDeleted?: boolean;
};

/**
 * Whether the report actions were actually fetched, which is the only acceptable evidence that something we cannot
 * find was deleted rather than never loaded.
 *
 * Unlike `hasLoadedReportActions` this deliberately ignores the offline state: being offline only means we cannot
 * fetch right now, so it can be used to stop waiting for data, but never to conclude that the data is gone.
 */
function hasConfirmedLoadedReportActions(reportLoadingState: OnyxInputOrEntry<ReportLoadingState>): boolean {
    if (!reportLoadingState) {
        return false;
    }
    return reportLoadingState?.hasOnceLoadedReportActions === true || reportLoadingState?.isLoadingInitialReportActions === false;
}

/**
 * Whether we should stop waiting for the report actions, which is what the loading skeletons rely on. It tolerates
 * the offline state so we don't sit on a skeleton that can never resolve while there is no connection.
 */
function hasLoadedReportActions(reportLoadingState: OnyxInputOrEntry<ReportLoadingState>, isOffline = false): boolean {
    if (!reportLoadingState) {
        return false;
    }
    return hasConfirmedLoadedReportActions(reportLoadingState) || isOffline;
}

function isThreadReportDeleted(report: OnyxInputOrEntry<Report>, reportLoadingState: OnyxInputOrEntry<ReportLoadingState>): boolean {
    const hasConfirmedLoadedThreadReportActions = hasConfirmedLoadedReportActions(reportLoadingState);
    return (!report?.reportID && report?.statusNum === CONST.REPORT.STATUS_NUM.CLOSED) || (hasConfirmedLoadedThreadReportActions && !report?.reportID);
}

function decodeDeleteNavigateBackUrl(url: string): string {
    try {
        return decodeURIComponent(url);
    } catch {
        return url;
    }
}

function doesDeleteNavigateBackUrlIncludeDuplicatesReview(url?: string): boolean {
    if (!url) {
        return false;
    }
    return decodeDeleteNavigateBackUrl(url).includes('/duplicates/review');
}

function doesDeleteNavigateBackUrlIncludeSpecificDuplicatesReview(url?: string, threadReportID?: string): boolean {
    if (!threadReportID) {
        return false;
    }
    const decodedDeleteNavigateBackUrl = decodeDeleteNavigateBackUrl(url ?? '');
    return decodedDeleteNavigateBackUrl.includes('/duplicates/review') && decodedDeleteNavigateBackUrl.includes(threadReportID);
}

function getParentReportActionDeletionStatus({
    hasLoadedParentReportActions,
    isOffline = false,
    parentReportAction,
    parentReportActionID,
    parentReportID,
    parentReportLoadingState,
    shouldRequireParentReportActionID = true,
    shouldTreatMissingParentReportAsDeleted = false,
}: ParentReportActionDeletionStatusParams) {
    const hasLoadedParentReportActionsValue = hasLoadedParentReportActions ?? hasLoadedReportActions(parentReportLoadingState, isOffline);
    const hasConfirmedLoadedParentReportActionsValue = hasLoadedParentReportActions ?? hasConfirmedLoadedReportActions(parentReportLoadingState);
    const canUseParentActionIDForMissingCheck = !shouldRequireParentReportActionID || !!parentReportActionID;
    const isParentActionMissingAfterLoad = !!parentReportID && canUseParentActionIDForMissingCheck && hasConfirmedLoadedParentReportActionsValue && !parentReportAction;
    const isParentActionDeleted = !!parentReportAction && (parentReportAction.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE || isDeletedAction(parentReportAction));
    const isMissingParentReport = shouldTreatMissingParentReportAsDeleted && !parentReportID && !parentReportAction?.reportActionID;
    const wasParentActionDeleted = isParentActionDeleted || isParentActionMissingAfterLoad || isMissingParentReport;

    return {hasLoadedParentReportActions: hasLoadedParentReportActionsValue, isParentActionMissingAfterLoad, isParentActionDeleted, wasParentActionDeleted};
}

export {
    decodeDeleteNavigateBackUrl,
    doesDeleteNavigateBackUrlIncludeDuplicatesReview,
    doesDeleteNavigateBackUrlIncludeSpecificDuplicatesReview,
    getParentReportActionDeletionStatus,
    hasConfirmedLoadedReportActions,
    hasLoadedReportActions,
    isThreadReportDeleted,
};

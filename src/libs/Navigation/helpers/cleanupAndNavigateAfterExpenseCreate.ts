import {getReportOrDraftReport, isMoneyRequestReport} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import type {Report, ReportAction} from '@src/types/onyx';
import type DeepValueOf from '@src/types/utils/DeepValueOf';

import type {OnyxEntry} from 'react-native-onyx';

import cleanupAfterExpenseCreate from './cleanupAfterExpenseCreate';
import navigateAfterExpenseCreate from './navigateAfterExpenseCreate';

type CleanupAndNavigateAfterExpenseCreateParams = {
    report: OnyxEntry<Report>;
    draftTransactionIDs: string[] | undefined;
    transactionID: string | undefined;
    isFromGlobalCreate: boolean | undefined;
    backToReport?: string;
    optimisticChatReportID?: string;
    isInvoice?: boolean;
    linkedTrackedExpenseReportAction?: OnyxEntry<ReportAction>;
    action: DeepValueOf<typeof CONST.IOU.ACTION>;
    /** Pass false on dismiss-first fast paths, which already navigated before the transaction was created.
     *  Cleanup and the pending-new-transaction registration still run so the report preview carousel can
     *  scroll to the new expense. */
    shouldNavigate?: boolean;
};

function cleanupAndNavigateAfterExpenseCreate({
    report,
    draftTransactionIDs,
    transactionID,
    isFromGlobalCreate,
    backToReport,
    optimisticChatReportID,
    isInvoice,
    linkedTrackedExpenseReportAction,
    action,
    shouldNavigate = true,
}: CleanupAndNavigateAfterExpenseCreateParams) {
    cleanupAfterExpenseCreate({
        draftTransactionIDs,
        linkedTrackedExpenseReportAction,
        // Only a navigating call has an upcoming transition to defer the draft cleanup past.
        shouldWaitForUpcomingTransition: shouldNavigate,
    });

    const finalActiveReportID = backToReport ?? report?.reportID ?? optimisticChatReportID;
    const hasMultipleTransactions = isInvoice ? false : isMoneyRequestReport(finalActiveReportID === report?.reportID ? report : getReportOrDraftReport(finalActiveReportID));
    const shouldAddPendingNewTransactionIDs =
        action === CONST.IOU.ACTION.CATEGORIZE || action === CONST.IOU.ACTION.SHARE ? true : !isInvoice && !!finalActiveReportID && !hasMultipleTransactions;

    navigateAfterExpenseCreate({
        activeReportID: finalActiveReportID,
        transactionID,
        isFromGlobalCreate,
        isInvoice,
        hasMultipleTransactions,
        shouldAddPendingNewTransactionIDs,
        shouldNavigate,
    });
}

export default cleanupAndNavigateAfterExpenseCreate;
export type {CleanupAndNavigateAfterExpenseCreateParams};

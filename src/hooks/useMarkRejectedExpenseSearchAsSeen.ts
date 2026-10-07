import {markRejectedExpenseSearchAsSeen} from '@libs/actions/Search';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, TransactionViolations} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {useEffect} from 'react';

import useOnyx from './useOnyx';

// Expense-level rejects pin a rejected-expense violation on the transaction.
const hasRejectedExpenseViolationSelector = (allTransactionViolations: OnyxCollection<TransactionViolations>) =>
    Object.values(allTransactionViolations ?? {}).some((violations) => violations?.some((violation) => violation.name === CONST.VIOLATIONS.AUTO_REPORTED_REJECTED_EXPENSE));

// Report-level rejects add no violation; they reopen the report with a "rejected" next step instead.
const hasRejectedReportSelector = (allReports: OnyxCollection<Report>) =>
    Object.values(allReports ?? {}).some((report) => report?.nextStep?.messageKey === CONST.NEXT_STEP.MESSAGE_KEY.REJECTED_REPORT);

/**
 * Permanently unlocks the "Rejected" suggested search. The first time the current user has an expense-level reject (a
 * transaction carrying a rejected-expense violation) or a report-level reject (a report whose next step says it was
 * rejected), that fact is persisted to an NVP so the Search LHN entry keeps showing from then on, even after the
 * rejected expenses are fixed or resubmitted (both markers are cleared at that point).
 * Setting the NVP is idempotent, so no extra gating is needed while Onyx is still hydrating.
 */
function useMarkRejectedExpenseSearchAsSeen() {
    const [hasSeenRejectedExpense] = useOnyx(ONYXKEYS.NVP_HAS_SEEN_REJECTED_EXPENSE);
    const [hasRejectedExpenseViolation] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, {selector: hasRejectedExpenseViolationSelector});
    const [hasRejectedReport] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: hasRejectedReportSelector});

    useEffect(() => {
        if (hasSeenRejectedExpense || (!hasRejectedExpenseViolation && !hasRejectedReport)) {
            return;
        }
        markRejectedExpenseSearchAsSeen();
    }, [hasSeenRejectedExpense, hasRejectedExpenseViolation, hasRejectedReport]);
}

export default useMarkRejectedExpenseSearchAsSeen;

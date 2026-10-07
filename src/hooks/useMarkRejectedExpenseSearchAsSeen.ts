import {markRejectedExpenseSearchAsSeen} from '@libs/actions/Search';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {TransactionViolations} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {useEffect} from 'react';

import useOnyx from './useOnyx';

const hasRejectedExpenseViolationSelector = (allTransactionViolations: OnyxCollection<TransactionViolations>) =>
    Object.values(allTransactionViolations ?? {}).some((violations) => violations?.some((violation) => violation.name === CONST.VIOLATIONS.AUTO_REPORTED_REJECTED_EXPENSE));

/**
 * Permanently unlocks the "Rejected" suggested search. The first time the current user has a transaction carrying a
 * rejected-expense violation, that fact is persisted to an NVP so the Search LHN entry keeps showing from then on,
 * even after the rejected expenses are fixed or resubmitted (the violation itself is removed at that point).
 * Setting the NVP is idempotent, so no extra gating is needed while Onyx is still hydrating.
 */
function useMarkRejectedExpenseSearchAsSeen() {
    const [hasSeenRejectedExpense] = useOnyx(ONYXKEYS.NVP_HAS_SEEN_REJECTED_EXPENSE);
    const [hasRejectedExpenseViolation] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, {selector: hasRejectedExpenseViolationSelector});

    useEffect(() => {
        if (hasSeenRejectedExpense || !hasRejectedExpenseViolation) {
            return;
        }
        markRejectedExpenseSearchAsSeen();
    }, [hasSeenRejectedExpense, hasRejectedExpenseViolation]);
}

export default useMarkRejectedExpenseSearchAsSeen;

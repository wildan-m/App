import {useMemo} from 'react';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {isViolationDismissed, mergeProhibitedViolations, shouldShowDuplicateViolation, shouldShowViolation} from '@libs/TransactionUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {TransactionViolation, TransactionViolations} from '@src/types/onyx';
import getEmptyArray from '@src/types/utils/getEmptyArray';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';

function useTransactionViolations(transactionID?: string, shouldShowRterForSettledReport = true): TransactionViolations {
    const [transaction] = useOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION}${getNonEmptyStringOnyxID(transactionID)}`);
    const [transactionViolations = getEmptyArray<TransactionViolation>()] = useOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transactionID}`);
    // Full collection subscription is intentional: shouldShowDuplicateViolation needs to
    // look up duplicate transactions' violations to verify bidirectional links, and a selector
    // approach introduces a loading-state ambiguity that causes stale violations to flash.
    const [allTransactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [iouReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(transaction?.reportID)}`);
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${iouReport?.policyID}`);
    const currentUserDetails = useCurrentUserPersonalDetails();

    return useMemo(
        () =>
            mergeProhibitedViolations(
                transactionViolations.filter(
                    (violation: TransactionViolation) =>
                        !isViolationDismissed(transaction, violation, currentUserDetails.email ?? '', currentUserDetails.accountID, iouReport, policy) &&
                        shouldShowViolation(iouReport, policy, violation.name, currentUserDetails.email ?? '', shouldShowRterForSettledReport, transaction) &&
                        (!transactionID || shouldShowDuplicateViolation(transactionID, violation, allTransactionViolations)),
                ),
            ),
        [
            transaction,
            transactionViolations,
            allTransactionViolations,
            transactionID,
            iouReport,
            policy,
            shouldShowRterForSettledReport,
            currentUserDetails.email,
            currentUserDetails.accountID,
        ],
    );
}

export default useTransactionViolations;

import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction} from '@src/types/onyx';
import type {ReportTransactionsAndViolationsDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

import {useCallback} from 'react';

import useOnyx from './useOnyx';

/**
 * Returns the report's transactions, or `undefined` while the derived value hasn't delivered them yet.
 * Callers must not coalesce this to an empty object when they need to tell "no transactions" apart from
 * "not loaded yet" — that distinction is what keeps the initial load from looking like a batch of additions.
 */
function useReportTransactionsCollection(reportID?: string): OnyxCollection<Transaction> {
    const transactionsSelector = useCallback(
        (allReportsTransactionsAndViolations: ReportTransactionsAndViolationsDerivedValue | undefined) => {
            return reportID ? allReportsTransactionsAndViolations?.[reportID]?.transactions : undefined;
        },
        [reportID],
    );

    const [reportTransactions] = useOnyx(ONYXKEYS.DERIVED.REPORT_TRANSACTIONS_AND_VIOLATIONS, {
        selector: transactionsSelector,
    });

    return reportTransactions;
}

export default useReportTransactionsCollection;

import initSplitExpense from '@libs/actions/SplitExpenses';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, Transaction} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

/**
 * Regression test for https://github.com/Expensify/App/issues/97453
 *
 * A negative expense (e.g. a Per Diem expense whose subrate quantity makes the amount negative) that is split
 * and then reverted must keep its negative sign. While the split is open the original transaction is parked in
 * the SPLIT_REPORT_ID placeholder report, so reading its amount without allowing negative values returned the
 * absolute value and the split draft total lost the sign.
 */
describe('Issue 97453 - negative expense split draft total', () => {
    const ORIGINAL_TRANSACTION_ID = 'originalTx97453';
    const CHILD_TRANSACTION_ID_1 = 'childTx97453a';
    const CHILD_TRANSACTION_ID_2 = 'childTx97453b';
    const EXPENSE_REPORT_ID = 'expenseReport97453';
    const POLICY_ID = 'policy97453';

    // A -$100.00 expense on an expense report is stored with the opposite sign, so amount is +10000.
    const STORED_ORIGINAL_AMOUNT = 10000;

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.multiSet({
            [`${ONYXKEYS.COLLECTION.REPORT}${EXPENSE_REPORT_ID}`]: {
                reportID: EXPENSE_REPORT_ID,
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: POLICY_ID,
                chatType: undefined,
            },
            // The original transaction is parked in the split placeholder report while the split exists.
            [`${ONYXKEYS.COLLECTION.TRANSACTION}${ORIGINAL_TRANSACTION_ID}`]: {
                transactionID: ORIGINAL_TRANSACTION_ID,
                reportID: CONST.REPORT.SPLIT_REPORT_ID,
                amount: STORED_ORIGINAL_AMOUNT,
                currency: CONST.CURRENCY.USD,
                merchant: 'Per Diem',
                created: '2026-07-30',
                comment: {},
            },
            [`${ONYXKEYS.COLLECTION.TRANSACTION}${CHILD_TRANSACTION_ID_1}`]: {
                transactionID: CHILD_TRANSACTION_ID_1,
                reportID: EXPENSE_REPORT_ID,
                amount: STORED_ORIGINAL_AMOUNT,
                modifiedAmount: STORED_ORIGINAL_AMOUNT / 2,
                currency: CONST.CURRENCY.USD,
                merchant: 'Per Diem',
                created: '2026-07-30',
                comment: {originalTransactionID: ORIGINAL_TRANSACTION_ID, source: CONST.IOU.TYPE.SPLIT},
            },
            [`${ONYXKEYS.COLLECTION.TRANSACTION}${CHILD_TRANSACTION_ID_2}`]: {
                transactionID: CHILD_TRANSACTION_ID_2,
                reportID: EXPENSE_REPORT_ID,
                amount: STORED_ORIGINAL_AMOUNT,
                modifiedAmount: STORED_ORIGINAL_AMOUNT / 2,
                currency: CONST.CURRENCY.USD,
                merchant: 'Per Diem',
                created: '2026-07-30',
                comment: {originalTransactionID: ORIGINAL_TRANSACTION_ID, source: CONST.IOU.TYPE.SPLIT},
            },
        });
        await waitForBatchedUpdates();
    });

    it('keeps the negative sign on the split draft total when the split edit flow is opened', async () => {
        const childTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.TRANSACTION}${CHILD_TRANSACTION_ID_1}`,
                callback: (value) => {
                    Onyx.disconnect(connection);
                    resolve(value);
                },
            });
        });
        const expenseReport = await new Promise<OnyxEntry<Report>>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT}${EXPENSE_REPORT_ID}`,
                callback: (value) => {
                    Onyx.disconnect(connection);
                    resolve(value);
                },
            });
        });

        initSplitExpense(childTransaction, expenseReport, undefined, undefined, undefined, undefined, {isProduction: false});
        await waitForBatchedUpdates();

        const draftTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${ORIGINAL_TRANSACTION_ID}`,
                callback: (value) => {
                    Onyx.disconnect(connection);
                    resolve(value);
                },
            });
        });

        // Each split row keeps its own signed amount ...
        expect(draftTransaction?.comment?.splitExpenses?.map((split) => split.amount)).toEqual([-5000, -5000]);
        // ... and the draft total must stay negative too, otherwise redistributing after a split is removed
        // flips the sign of the amount that the reverse split writes back onto the original expense.
        expect(draftTransaction?.amount).toBe(-10000);
    });
});

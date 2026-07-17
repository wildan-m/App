import {getOriginalMessage} from '@libs/ReportActionsUtils';
import {buildOptimisticModifiedExpenseReportAction} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import type {Policy, Report, Transaction} from '@src/types/onyx';
import type {OriginalMessageModifiedExpense} from '@src/types/onyx/OriginalMessage';
import type {TransactionChanges} from '@src/types/onyx/Transaction';

const POLICY = {
    id: 'policy1',
    name: 'Workspace with taxes',
    type: CONST.POLICY.TYPE.TEAM,
    role: CONST.POLICY.ROLE.ADMIN,
    owner: 'owner@test.com',
    outputCurrency: 'USD',
    isPolicyExpenseChatEnabled: true,
    taxRates: {
        name: 'Tax',
        defaultExternalID: 'taxRateFivePercent',
        defaultValue: '5%',
        foreignTaxDefault: 'taxRateExempt',
        taxes: {
            taxRateFivePercent: {name: 'Tax 5', value: '5%', code: 'taxRateFivePercent', isDisabled: false},
            taxRateExempt: {name: 'Tax exempt', value: '0%', code: 'taxRateExempt', isDisabled: false},
        },
    },
} satisfies Policy;

const TRANSACTION_THREAD = {reportID: 'thread1'} satisfies Report;

const OLD_TRANSACTION = {
    transactionID: 'transaction1',
    reportID: 'report1',
    amount: 10000,
    currency: 'USD',
    taxCode: 'taxRateFivePercent',
    taxAmount: 476,
    created: '2026-07-17',
    merchant: 'Merchant',
    comment: {},
} satisfies Transaction;

function buildOriginalMessage(transactionChanges: TransactionChanges): OriginalMessageModifiedExpense | undefined {
    const reportAction = buildOptimisticModifiedExpenseReportAction(TRANSACTION_THREAD, OLD_TRANSACTION, transactionChanges, true, POLICY, undefined);
    return getOriginalMessage<typeof CONST.REPORT.ACTIONS.TYPE.MODIFIED_EXPENSE>(reportAction);
}

describe('Issue 91564 - tax rate system message after currency change', () => {
    it('includes the tax rate change when a currency edit switches the tax code to the foreign default', () => {
        // Mirrors updateMoneyRequestAmountAndCurrency, which always sends amount, currency and taxCode together.
        const originalMessage = buildOriginalMessage({amount: 10000, currency: 'EUR', taxCode: 'taxRateExempt', taxAmount: 0});

        expect(originalMessage?.oldTaxRate).toBe('5%');
        expect(originalMessage?.taxRate).toBe('0%');
    });

    it('does not add a redundant tax rate message when an amount edit keeps the same tax code', () => {
        const originalMessage = buildOriginalMessage({amount: 20000, currency: 'USD', taxCode: 'taxRateFivePercent', taxAmount: 952});

        expect(originalMessage).not.toHaveProperty('oldTaxRate');
        expect(originalMessage).not.toHaveProperty('taxRate');
    });

    it('still reports a tax rate change made directly from the tax rate page', () => {
        const originalMessage = buildOriginalMessage({taxCode: 'taxRateExempt', taxAmount: 0});

        expect(originalMessage?.oldTaxRate).toBe('5%');
        expect(originalMessage?.taxRate).toBe('0%');
    });
});

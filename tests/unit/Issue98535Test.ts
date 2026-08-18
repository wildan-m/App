import type {CurrencyListActionsContextType} from '@components/CurrencyListContextProvider';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {getTransactionReportName} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import type {Report, Transaction} from '@src/types/onyx';

import {createRandomDistanceRequestTransaction} from '../utils/collections/transaction';

const translate: LocalizedTranslate = (path, ...parameters) => (path === 'iou.threadExpenseReportName' ? `${String(parameters.at(0))} for ${String(parameters.at(1))}` : path);

const convertToDisplayString: CurrencyListActionsContextType['convertToDisplayString'] = (amount, currency) => `${currency ?? ''} ${(Math.abs(amount ?? 0) / 100).toFixed(2)}`;

/**
 * A self DM map distance expense that came back from the server with the workspace commuter exclusion applied:
 * `amount`/`merchant` describe the full 6.46 mi route, `modifiedAmount`/`modifiedMerchant` the commuter reduced one.
 */
function buildCommuterExcludedTransaction(): Transaction {
    const transaction = createRandomDistanceRequestTransaction(0);
    return {
        ...transaction,
        reportID: '2',
        amount: 491,
        modifiedAmount: 415,
        currency: 'MYR',
        merchant: '6.46 mi @ RM0.76 / mi',
        modifiedMerchant: '5.46 mi @ RM0.76 / mi',
        routes: {route0: {distance: 10396, geometry: {coordinates: null}}},
        comment: {
            ...transaction.comment,
            customUnit: {
                ...transaction.comment?.customUnit,
                quantity: 6.46,
                commuterExclusion: 1,
                reimbursableDistance: 5.46,
            },
        },
    };
}

describe('Issue 98535 — self DM distance expense thread header', () => {
    it('reports the full route distance and amount when the expense is not on a workspace expense report', () => {
        const selfDMChat: Report = {reportID: '2', type: CONST.REPORT.TYPE.CHAT, chatType: CONST.REPORT.CHAT_TYPE.SELF_DM};

        const name = getTransactionReportName({translate, convertToDisplayString, reportAction: undefined, linkedTransaction: buildCommuterExcludedTransaction(), report: selfDMChat});

        expect(name).toBe('MYR 4.91 for 6.46 mi @ RM0.76 / mi');
    });

    it('keeps the commuter excluded distance and amount when the expense is on a workspace expense report', () => {
        const expenseReport: Report = {reportID: '2', type: CONST.REPORT.TYPE.EXPENSE, policyID: 'POLICY'};

        const name = getTransactionReportName({translate, convertToDisplayString, reportAction: undefined, linkedTransaction: buildCommuterExcludedTransaction(), report: expenseReport});

        expect(name).toBe('MYR 4.15 for 5.46 mi @ RM0.76 / mi');
    });
});

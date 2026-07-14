import type {TransactionListItemType} from '@components/Search/SearchList/ListItem/types';
import {mapTransactionItemToSelectedEntry} from '@components/Search/selectionBuilders';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {CardList, ReportAction} from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import createRandomCard from '../utils/collections/card';
import createPersonalDetails from '../utils/collections/personalDetails';
import createRandomReportAction from '../utils/collections/reportActions';
import createRandomTransaction from '../utils/collections/transaction';

const ADMIN_ACCOUNT_ID = 1;
const CARDHOLDER_ACCOUNT_ID = 2;
const CARD_ID = 555;

const allCards: CardList = {
    [CARD_ID]: createRandomCard(CARD_ID, {accountID: CARDHOLDER_ACCOUNT_ID}),
};

/** Builds an unreported managed card expense row, as the Expenses page hands it to the selection builder. */
function buildTransactionItem(overrides: Partial<TransactionListItemType> = {}): TransactionListItemType {
    const personalDetails = createPersonalDetails(CARDHOLDER_ACCOUNT_ID);

    return {
        ...createRandomTransaction(1),
        // `Transaction.errors` widens to `ReceiptErrors`, which the list item's `errors` does not accept
        errors: undefined,
        reportID: CONST.REPORT.UNREPORTED_REPORT_ID,
        managedCard: true,
        cardID: CARD_ID,
        keyForList: '1',
        report: undefined,
        policy: undefined,
        reportAction: undefined,
        holdReportAction: undefined,
        from: personalDetails,
        to: personalDetails,
        formattedFrom: '',
        formattedTo: '',
        formattedTotal: 0,
        formattedMerchant: '',
        date: '2026-07-14',
        shouldShowMerchant: false,
        shouldShowYear: false,
        shouldShowYearSubmitted: false,
        shouldShowYearApproved: false,
        shouldShowYearPosted: false,
        shouldShowYearExported: false,
        isAmountColumnWide: false,
        isTaxAmountColumnWide: false,
        allActions: [CONST.SEARCH.ACTION_TYPES.VIEW],
        action: CONST.SEARCH.ACTION_TYPES.VIEW,
        canPay: false,
        canApprove: false,
        canSubmit: false,
        canChangeApprover: false,
        ...overrides,
    };
}

function buildSelectedEntry(item: TransactionListItemType, cards: CardList | undefined = allCards) {
    const [, selectedEntry] = mapTransactionItemToSelectedEntry({
        item,
        itemTransaction: undefined,
        originalItemTransaction: undefined,
        currentUserLogin: 'admin@example.com',
        currentUserAccountID: ADMIN_ACCOUNT_ID,
        reportNameValuePairs: undefined,
        outstandingReportsByPolicyID: undefined,
        selfDMReport: undefined,
        isProduction: false,
        allowNegativeAmount: false,
        parentReport: undefined,
        allCards: cards,
    });

    return selectedEntry;
}

describe('selectionBuilders', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    describe('mapTransactionItemToSelectedEntry', () => {
        it('resolves the cardholder as the owner of an unreported card expense', () => {
            const selectedEntry = buildSelectedEntry(buildTransactionItem());

            expect(selectedEntry.ownerAccountID).toBe(CARDHOLDER_ACCOUNT_ID);
        });

        it('keeps reading the owner from the report action for a reported expense', () => {
            const reportAction: ReportAction = {...createRandomReportAction(1), actorAccountID: CARDHOLDER_ACCOUNT_ID};
            const item = buildTransactionItem({reportID: '4321', managedCard: false, cardID: undefined, reportAction});

            const selectedEntry = buildSelectedEntry(item);

            expect(selectedEntry.ownerAccountID).toBe(CARDHOLDER_ACCOUNT_ID);
        });

        it('leaves the owner unresolved for an unreported expense that did not come from a card', () => {
            const selectedEntry = buildSelectedEntry(buildTransactionItem({managedCard: false, cardID: undefined}));

            expect(selectedEntry.ownerAccountID).toBeUndefined();
        });

        it('leaves the owner unresolved when the card of an unreported card expense is not available', () => {
            const selectedEntry = buildSelectedEntry(buildTransactionItem(), {});

            expect(selectedEntry.ownerAccountID).toBeUndefined();
        });
    });
});

import {isTravelCardTransaction} from '@libs/CardUtils';
import {getExpenseTypeTranslationKey, getTransactionType, isExpensifyCardTransaction, isManagedCardTransaction, isPending} from '@libs/TransactionUtils';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {Card, Transaction} from '@src/types/onyx';
import type IconAsset from '@src/types/utils/IconAsset';

import type {OnyxEntry} from 'react-native-onyx';

import {useMemoizedLazyExpensifyIcons} from './useLazyAsset';

type ExpenseTypeIcons = Record<'Car' | 'CreditCard' | 'CreditCardLock' | 'CreditCardWithPlane' | 'ExpensifyCard' | 'Cash' | 'Clock' | 'CalendarSolid', IconAsset>;

type ExpenseTypeDetails = {
    /** The expense type as used by the Search `Type` column */
    type: ReturnType<typeof getTransactionType>;

    /** The icon representing the expense type */
    typeIcon: IconAsset;

    /** The translation key of the plain expense type name, as used by the Search `Type` column */
    typeTranslationKey: TranslationPaths;

    /** The translation key of the user-facing expense type label, which tells company and personal cards apart */
    typeLabelTranslationKey: TranslationPaths;

    /** Whether the expense is a card transaction that has not posted yet */
    isPendingCardTransaction: boolean;

    /** Whether the expense was made with an Expensify Card */
    isExpensifyCard: boolean;

    /** Whether the expense was made with a company card managed by an admin */
    isManagedCard: boolean;

    /** Whether the expense was made with a travel billing card */
    isTravelBillingCard: boolean;
};

const getTypeIcon = (icons: ExpenseTypeIcons, type?: string, isExpensifyCard?: boolean, isManagedCard?: boolean, isTravelBillingCard?: boolean) => {
    switch (type) {
        case CONST.SEARCH.TRANSACTION_TYPE.CARD:
            // Travel billing cards are technically Expensify-issued (bank === EXPENSIFY_CARD.BANK), so this branch must come before the isExpensifyCard branch.
            if (isTravelBillingCard) {
                return icons.CreditCardWithPlane;
            }
            if (isExpensifyCard) {
                return icons.ExpensifyCard;
            }
            if (isManagedCard) {
                return icons.CreditCardLock;
            }
            return icons.CreditCard;
        case CONST.SEARCH.TRANSACTION_TYPE.DISTANCE:
            return icons.Car;
        case CONST.SEARCH.TRANSACTION_TYPE.TIME:
            return icons.Clock;
        case CONST.SEARCH.TRANSACTION_TYPE.PER_DIEM:
            return icons.CalendarSolid;
        case CONST.SEARCH.TRANSACTION_TYPE.CASH:
        default:
            return icons.Cash;
    }
};

/**
 * Resolves the expense type of a transaction together with the icon and labels used to represent it.
 * Shared by the Search `Type` column and the individual expense view so both stay in sync.
 */
function useExpenseTypeDetails(transaction: OnyxEntry<Transaction>, card: Card | undefined): ExpenseTypeDetails {
    const expensifyIcons = useMemoizedLazyExpensifyIcons([
        'Car',
        'CreditCard',
        'CreditCardHourglass',
        'CreditCardLock',
        'CreditCardWithPlane',
        'CreditCardWithPlaneHourglass',
        'ExpensifyCard',
        'ExpensifyCardHourglass',
        'Cash',
        'Clock',
        'CalendarSolid',
    ]);

    const type = getTransactionType(transaction, card);
    const isExpensifyCard = isExpensifyCardTransaction(transaction);
    const isManagedCard = isManagedCardTransaction(transaction);
    const isTravelBillingCard = isTravelCardTransaction(transaction?.feedCountry, card);
    const isPendingCardTransaction = isPending(transaction);

    const getPendingIcon = () => {
        if (isTravelBillingCard) {
            return expensifyIcons.CreditCardWithPlaneHourglass;
        }
        if (isExpensifyCard) {
            return expensifyIcons.ExpensifyCardHourglass;
        }
        return expensifyIcons.CreditCardHourglass;
    };

    const typeTranslationKey: TranslationPaths = isPendingCardTransaction ? 'iou.pending' : getExpenseTypeTranslationKey(type);

    const getTypeLabelTranslationKey = (): TranslationPaths => {
        if (isPendingCardTransaction) {
            return 'iou.pending';
        }
        if (isTravelBillingCard) {
            return 'cardTransactions.travelCard';
        }
        if (isExpensifyCard) {
            return 'cardTransactions.expensifyCard';
        }
        if (isManagedCard) {
            return 'cardTransactions.companyCard';
        }
        if (type === CONST.SEARCH.TRANSACTION_TYPE.CARD) {
            return 'cardTransactions.personalCard';
        }
        return typeTranslationKey;
    };

    return {
        type,
        typeIcon: isPendingCardTransaction ? getPendingIcon() : getTypeIcon(expensifyIcons, type, isExpensifyCard, isManagedCard, isTravelBillingCard),
        typeTranslationKey,
        typeLabelTranslationKey: getTypeLabelTranslationKey(),
        isPendingCardTransaction,
        isExpensifyCard,
        isManagedCard,
        isTravelBillingCard,
    };
}

export default useExpenseTypeDetails;

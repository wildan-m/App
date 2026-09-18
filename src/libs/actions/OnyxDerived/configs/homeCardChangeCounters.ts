import createOnyxDerivedValueConfig from '@userActions/OnyxDerived/createOnyxDerivedValueConfig';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction} from '@src/types/onyx';
import type {HomeCardChangeCountersDerivedValue} from '@src/types/onyx/DerivedValues';

/** The counters every card starts from, and the value used whenever there is nothing to count yet. */
const EMPTY_COUNTERS: HomeCardChangeCountersDerivedValue = {recentlyAdded: 0, insights: 0, yourSpendCards: 0};

/** The watched-field fingerprints of a single expense, one per card. */
type TransactionSignatures = {
    recentlyAdded: string;
    insights: string;
    yourSpendCards: string;
};

/**
 * The last fingerprint seen for every expense, so a write that touches fields no card renders can be ignored.
 * Kept at module level because the derived engine hands us only the changed members of the collection, and
 * reset through `onReset` so a cleared Onyx doesn't diff rehydrated data against pre-clear fingerprints.
 */
let previousSignatures = new Map<string, TransactionSignatures>();

/** The fields the "Recently added" rows render. */
function getRecentlyAddedSignature(transaction: Transaction): string {
    return [
        transaction.inserted,
        transaction.created,
        transaction.modifiedCreated,
        transaction.merchant,
        transaction.modifiedMerchant,
        transaction.amount,
        transaction.modifiedAmount,
        transaction.currency,
        transaction.modifiedCurrency,
        transaction.reportID,
        transaction.receipt?.receiptID,
        transaction.receipt?.source,
        transaction.pendingAction,
        Object.keys(transaction.pendingFields ?? {})
            .sort()
            .join(','),
    ].join('|');
}

/** The fields the Home insights group and total by. */
function getInsightsSignature(transaction: Transaction): string {
    return [
        transaction.amount,
        transaction.modifiedAmount,
        transaction.currency,
        transaction.modifiedCurrency,
        transaction.category,
        transaction.merchant,
        transaction.modifiedMerchant,
        transaction.created,
        transaction.modifiedCreated,
        transaction.reportID,
    ].join('|');
}

/** The fields the "Your Spend" card rows total by. */
function getYourSpendCardsSignature(transaction: Transaction): string {
    return [transaction.amount, transaction.modifiedAmount, transaction.currency, transaction.modifiedCurrency, transaction.cardID].join('|');
}

function getSignatures(transaction: Transaction): TransactionSignatures {
    return {
        recentlyAdded: getRecentlyAddedSignature(transaction),
        insights: getInsightsSignature(transaction),
        yourSpendCards: getYourSpendCardsSignature(transaction),
    };
}

/**
 * One change counter per Home card. Each counter moves only when an expense changes in a way that card
 * actually renders, which lets the card refetch its Search snapshot on a data change rather than on screen
 * focus. Pusher keeps `transactions_` current but never writes `snapshot_`, so without this signal a card has
 * no way to know its snapshot went stale.
 *
 * The compute is incremental: the derived engine passes only the expenses that changed since the last flush,
 * and each one is compared against the fingerprint it had then. A write that touches no watched field moves no
 * counter, so consumers don't refetch for it.
 */
export default createOnyxDerivedValueConfig({
    key: ONYXKEYS.DERIVED.HOME_CARD_CHANGE_COUNTERS,
    dependencies: [ONYXKEYS.COLLECTION.TRANSACTION],
    onReset: () => {
        previousSignatures = new Map<string, TransactionSignatures>();
    },
    compute: ([transactions], {sourceValues, currentValue}) => {
        const transactionUpdates = sourceValues?.[ONYXKEYS.COLLECTION.TRANSACTION];

        // No delta means a full compute: rebuild every fingerprint from scratch and keep the counters where they
        // are, since a first pass has nothing to compare against and must not read as a change to every card.
        if (!transactionUpdates) {
            previousSignatures = new Map<string, TransactionSignatures>();
            for (const [transactionKey, transaction] of Object.entries(transactions ?? {})) {
                if (!transaction) {
                    continue;
                }
                previousSignatures.set(transactionKey, getSignatures(transaction));
            }
            return currentValue ?? EMPTY_COUNTERS;
        }

        const counters = {...(currentValue ?? EMPTY_COUNTERS)};
        let hasRecentlyAddedChange = false;
        let hasInsightsChange = false;
        let hasYourSpendCardsChange = false;

        for (const [transactionKey, transaction] of Object.entries(transactionUpdates)) {
            const previous = previousSignatures.get(transactionKey);

            // A removed expense changes every card that listed it.
            if (!transaction) {
                previousSignatures.delete(transactionKey);
                if (previous) {
                    hasRecentlyAddedChange = true;
                    hasInsightsChange = true;
                    hasYourSpendCardsChange = true;
                }
                continue;
            }

            const next = getSignatures(transaction);
            previousSignatures.set(transactionKey, next);

            // A newly seen expense counts as a change for every card, which is what makes a just-created expense
            // refresh the cards it belongs in.
            if (!previous) {
                hasRecentlyAddedChange = true;
                hasInsightsChange = true;
                hasYourSpendCardsChange = true;
                continue;
            }

            hasRecentlyAddedChange ||= previous.recentlyAdded !== next.recentlyAdded;
            hasInsightsChange ||= previous.insights !== next.insights;
            hasYourSpendCardsChange ||= previous.yourSpendCards !== next.yourSpendCards;
        }

        // A burst of writes lands as one flush, so each card counts it once and refetches once.
        if (hasRecentlyAddedChange) {
            counters.recentlyAdded += 1;
        }
        if (hasInsightsChange) {
            counters.insights += 1;
        }
        if (hasYourSpendCardsChange) {
            counters.yourSpendCards += 1;
        }

        if (!hasRecentlyAddedChange && !hasInsightsChange && !hasYourSpendCardsChange) {
            return currentValue ?? EMPTY_COUNTERS;
        }

        return counters;
    },
});

import {useSearchSelectionContext} from '@components/Search/SearchContext';
import {getGroupCheckboxState, isRowChecked} from '@components/Search/selectionBuilders';

import {isTransactionPendingDelete} from '@libs/TransactionUtils';

import CONST from '@src/CONST';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';

/**
 * A search group's rows and its checkbox state, read from the live selection, so the header and the rows below it
 * cannot disagree about what the group shows.
 */
import {useEffect, useRef} from 'react';

import type {TransactionListItemType} from './types';

type GroupCheckboxArgs = {
    /** The group's original (un-prefixed) key, which its rows are stamped with */
    groupKey: string;

    /** The rows the group carries */
    groupTransactions: TransactionListItemType[];
};

/** What a group's checkbox shows. Every surface that draws one reads it from here, so they cannot disagree. */
function useGroupCheckboxState({groupKey, groupTransactions}: GroupCheckboxArgs): {isSelectAllChecked: boolean; isIndeterminate: boolean} {
    const {selectedTransactions, excludedTransactions, areAllMatchingItemsSelected} = useSearchSelectionContext();

    return getGroupCheckboxState({groupKey, children: groupTransactions, selectedTransactions, excludedTransactions, areAllMatchingItemsSelected});
}

/** The same, plus the group's rows stamped with the live selection, for the call sites that render those rows. */
function useGroupChildren({groupKey, groupTransactions}: GroupCheckboxArgs): {
    transactions: TransactionListItemType[];
    isSelectAllChecked: boolean;
    isIndeterminate: boolean;
} {
    // Read once: the checkbox state and the stamp answer the same question of the same three values, and must not diverge.
    const {selectedTransactions, excludedTransactions, areAllMatchingItemsSelected} = useSearchSelectionContext();
    const params = {groupKey, children: groupTransactions, selectedTransactions, excludedTransactions, areAllMatchingItemsSelected};

    // Stamp the live selection and the parent key onto each row, which is how a row checks whether its group was excluded.
    const transactions: TransactionListItemType[] = groupTransactions.map((transactionItem) => ({
        ...transactionItem,
        isSelected: isRowChecked({
            rowKey: transactionItem.keyForList,
            parentGroupKey: groupKey,
            selectedTransactions,
            excludedTransactions,
            areAllMatchingItemsSelected,
        }),
        selectionGroupKey: groupKey,
    }));

    return {transactions, ...getGroupCheckboxState(params)};
}

type GroupPendingActionArgs = {
    /** The pending action the group row itself carries, which always wins */
    itemPendingAction: PendingAction | undefined;

    /** The rows the group carries */
    groupTransactions: TransactionListItemType[];
};

/**
 * The pending action a group row draws, held across the moment its deleted rows leave the snapshot.
 *
 * A group whose rows are all pending delete reads as deleted, which is what hides it the instant the delete is
 * confirmed. The delete then succeeds and its success data removes those rows from the snapshot, leaving the group
 * with an empty list that would read as "not deleted" and flash the row back on screen until the refreshed search
 * snapshot drops it for good. Remembering the last verdict made on a non-empty list keeps the row hidden through
 * that gap. An empty list on its own never means deleted - every group starts empty until its own query is fetched.
 */
function useGroupPendingAction({itemPendingAction, groupTransactions}: GroupPendingActionArgs): PendingAction | undefined {
    const isDeletingEveryTransaction = groupTransactions.length > 0 && groupTransactions.every((transaction) => isTransactionPendingDelete(transaction));
    const wasDeletingEveryTransaction = useRef(false);

    useEffect(() => {
        // Skip the empty list, which is the state this is here to see past.
        if (groupTransactions.length === 0) {
            return;
        }
        wasDeletingEveryTransaction.current = isDeletingEveryTransaction;
    }, [groupTransactions.length, isDeletingEveryTransaction]);

    if (itemPendingAction) {
        return itemPendingAction;
    }

    const isDeleted = groupTransactions.length > 0 ? isDeletingEveryTransaction : wasDeletingEveryTransaction.current;

    return isDeleted ? CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE : undefined;
}

export default useGroupChildren;
export {useGroupCheckboxState, useGroupPendingAction};

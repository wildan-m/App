import type {OnyxCollection} from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction} from '@src/types/onyx';
import useOnyx from './useOnyx';

function selectHasOtherSurvivingSplitSibling(transactions: OnyxCollection<Transaction>, originalTransactionID: string | undefined, transactionID: string | undefined): boolean {
    if (!originalTransactionID) {
        return false;
    }
    for (const t of Object.values(transactions ?? {})) {
        if (
            t?.comment?.originalTransactionID === originalTransactionID &&
            t?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE &&
            t?.reportID !== CONST.REPORT.UNREPORTED_REPORT_ID &&
            t?.transactionID !== transactionID
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Returns true when at least one OTHER split child of `originalTransactionID` is still alive
 * (i.e., not pending deletion and not orphaned in the self-DM). Returning false here means the
 * caller transaction is the last surviving child, so the split tree is effectively gone and the
 * transaction can be treated as standalone for action-gating purposes — see issue 91105.
 */
function useHasOtherSurvivingSplitSibling(originalTransactionID: string | undefined, transactionID: string | undefined): boolean {
    const selector = (transactions: OnyxCollection<Transaction>) => selectHasOtherSurvivingSplitSibling(transactions, originalTransactionID, transactionID);
    const [hasOther] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION, {selector});
    return !!hasOther;
}

export default useHasOtherSurvivingSplitSibling;

import {getPolicyByCustomUnitID} from '@libs/PolicyUtils';
import {isExpenseUnreported} from '@libs/TransactionUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Transaction} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import useOnyx from './useOnyx';
import usePolicyForMovingExpenses from './usePolicyForMovingExpenses';

type UsePolicyForTransactionParams = {
    /** The transaction to determine the policy for */
    transaction: OnyxEntry<Transaction>;

    /** The report policy ID associated with the transaction */
    reportPolicyID: string | undefined;

    /** The current action being performed */
    action: string;

    /** The type of IOU (split, track, submit, etc.) */
    iouType: string;

    /** The draft policy linked to the report */
    policyDraft?: OnyxEntry<Policy>;

    /** Indicates if the request is a per diem request */
    isPerDiemRequest?: boolean;
};

type UsePolicyForTransactionResult = {
    /** The policy to use for the transaction */
    policy: OnyxEntry<Policy>;
};

function usePolicyForTransaction({transaction, reportPolicyID, action, iouType, policyDraft, isPerDiemRequest}: UsePolicyForTransactionParams): UsePolicyForTransactionResult {
    const {policyForMovingExpenses} = usePolicyForMovingExpenses();

    const customUnitID = transaction?.comment?.customUnit?.customUnitID;
    const [customUnitPolicy] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: (policies) => getPolicyByCustomUnitID(transaction, policies)}, [customUnitID]);

    const [reportPolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${reportPolicyID}`);

    const isUnreportedExpense = isExpenseUnreported(transaction);
    const isCreatingTrackExpense = action === CONST.IOU.ACTION.CREATE && iouType === CONST.IOU.TYPE.TRACK;

    // Fall back to the draft policy so a freshly created draft Submit workspace (e.g. "Submit to my employer" with no
    // existing workspace) is used when there's no existing moving-expenses policy. Mirrors the `reportPolicy ?? policyDraft`
    // fallback on the other branch below; without it `policy` is undefined and group-policy-gated UI (like the receipt
    // empty state) is wrongly hidden on the confirm page.
    const policyForSelfDMExpense = isPerDiemRequest ? customUnitPolicy : (policyForMovingExpenses ?? policyDraft);
    const policy = isUnreportedExpense || isCreatingTrackExpense ? policyForSelfDMExpense : (reportPolicy ?? policyDraft);

    return {policy};
}

export default usePolicyForTransaction;

import {isPaidGroupPolicy} from '@libs/PolicyUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import useOnyx from './useOnyx';
import usePolicy from './usePolicy';
import usePolicyForMovingExpenses from './usePolicyForMovingExpenses';

const firstPaidPolicyIDSelector = (policies: OnyxCollection<Policy>) => Object.values(policies ?? {}).find((policy) => isPaidGroupPolicy(policy) && !policy?.isJoinRequestPending)?.id;

/**
 * Resolves the paid workspace whose mileage rates a distance split should offer when the split itself
 * resolves no policy.
 *
 * A split started from a DM has no report policy, so the transaction is stamped with the P2P sentinel
 * rate and no workspace rate is reachable — even for a user who belongs to a paid workspace. This hook
 * supplies that workspace so its rates can be offered, without touching the rate the split defaults to.
 *
 * The workspace the user actively works in wins over the first paid workspace they happen to belong to,
 * so people who belong to several workspaces are offered the rates they expect.
 *
 * `shouldResolve` lets the caller keep its own resolution order — the hook returns `undefined` whenever
 * the caller already has a policy or the case doesn't apply.
 */
function useSplitDistanceFallbackPolicy(shouldResolve: boolean): OnyxEntry<Policy> {
    const {policyForMovingExpenses} = usePolicyForMovingExpenses();
    const [firstPaidPolicyID] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: firstPaidPolicyIDSelector});
    const firstPaidPolicy = usePolicy(firstPaidPolicyID);

    if (!shouldResolve) {
        return undefined;
    }

    return isPaidGroupPolicy(policyForMovingExpenses) ? policyForMovingExpenses : firstPaidPolicy;
}

export default useSplitDistanceFallbackPolicy;

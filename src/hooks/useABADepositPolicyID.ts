import ONYXKEYS from '@src/ONYXKEYS';

import {createABADepositPolicyIDSelector} from '@selectors/Policy';
import {useMemo} from 'react';

import useOnyx from './useOnyx';

/** The workspace that reimburses the user through ABA files, which means their deposit account only needs the ABA details. */
function useABADepositPolicyID(): string | undefined {
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const abaDepositPolicyIDSelector = useMemo(() => createABADepositPolicyIDSelector(activePolicyID), [activePolicyID]);
    const [abaDepositPolicyID] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: abaDepositPolicyIDSelector});
    return abaDepositPolicyID;
}

export default useABADepositPolicyID;

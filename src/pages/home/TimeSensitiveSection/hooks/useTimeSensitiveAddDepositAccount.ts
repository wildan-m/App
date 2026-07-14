import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {BankAccountList, Policy} from '@src/types/onyx';
import {getEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxCollection} from 'react-native-onyx';

import {hasReimbursementEnabledPolicySelector} from '@selectors/Policy';
import {useCallback} from 'react';

function useTimeSensitiveAddDepositAccount() {
    const {login} = useCurrentUserPersonalDetails();
    const [bankAccountList = getEmptyObject<BankAccountList>()] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST);
    const reimbursementEnabledSelector = useCallback((policies: OnyxCollection<Policy>) => hasReimbursementEnabledPolicySelector(policies, login), [login]);
    const [hasReimbursementEnabledPolicy] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {
        selector: reimbursementEnabledSelector,
    });

    const hasDepositAccount = Object.values(bankAccountList ?? {}).some(
        (account) => account?.accountData?.state === CONST.BANK_ACCOUNT.STATE.OPEN && account?.accountData?.type === CONST.BANK_ACCOUNT.TYPE.PERSONAL,
    );

    return {
        shouldShowAddDepositAccount: !!hasReimbursementEnabledPolicy && !hasDepositAccount,
    };
}

export default useTimeSensitiveAddDepositAccount;

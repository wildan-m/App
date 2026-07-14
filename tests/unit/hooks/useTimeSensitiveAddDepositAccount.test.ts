/* eslint-disable @typescript-eslint/naming-convention */
import {renderHook} from '@testing-library/react-native';

import useTimeSensitiveAddDepositAccount from '@pages/home/TimeSensitiveSection/hooks/useTimeSensitiveAddDepositAccount';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {BankAccount, BankAccountList} from '@src/types/onyx';
import type Policy from '@src/types/onyx/Policy';

import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_LOGIN = 'user@example.com';

function makePolicy(overrides: Partial<Policy> & {id: string}): Policy {
    return {
        name: `Policy ${overrides.id}`,
        type: CONST.POLICY.TYPE.TEAM,
        role: CONST.POLICY.ROLE.USER,
        owner: CURRENT_USER_LOGIN,
        outputCurrency: CONST.CURRENCY.USD,
        isPolicyExpenseChatEnabled: true,
        ...overrides,
    };
}

function makeBankAccount(bankAccountID: number, state: string, type?: string): BankAccount {
    return {
        bankCurrency: 'USD',
        bankCountry: 'US',
        accountData: {
            bankAccountID,
            state,
            type,
        },
    } as BankAccount;
}

async function setPolicies(...policies: Policy[]) {
    await Promise.all(policies.map((policy) => Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy)));
}

describe('useTimeSensitiveAddDepositAccount', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.multiSet({
            [ONYXKEYS.SESSION]: {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_LOGIN},
            [ONYXKEYS.PERSONAL_DETAILS_LIST]: {[CURRENT_USER_ACCOUNT_ID]: {accountID: CURRENT_USER_ACCOUNT_ID, login: CURRENT_USER_LOGIN}},
        });
        await waitForBatchedUpdates();
    });

    afterEach(async () => {
        await Onyx.clear();
    });

    it('shows the task when the user is on a reimbursement-enabled policy and has no deposit account', async () => {
        await setPolicies(makePolicy({id: 'policy1', reimbursement: {enabled: true}}));
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(true);
    });

    it('hides the task when no policy has reimbursements enabled', async () => {
        await setPolicies(makePolicy({id: 'policy1', reimbursement: {enabled: false}}), makePolicy({id: 'policy2'}));
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(false);
    });

    it('hides the task when the user already has an OPEN personal bank account', async () => {
        await setPolicies(makePolicy({id: 'policy1', reimbursement: {enabled: true}}));
        const bankAccountList: BankAccountList = {
            '100': makeBankAccount(100, CONST.BANK_ACCOUNT.STATE.OPEN, CONST.BANK_ACCOUNT.TYPE.PERSONAL),
        };
        await Onyx.merge(ONYXKEYS.BANK_ACCOUNT_LIST, bankAccountList);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(false);
    });

    it('still shows the task when the only personal bank account is not OPEN yet', async () => {
        await setPolicies(makePolicy({id: 'policy1', reimbursement: {enabled: true}}));
        const bankAccountList: BankAccountList = {
            '100': makeBankAccount(100, CONST.BANK_ACCOUNT.STATE.PENDING, CONST.BANK_ACCOUNT.TYPE.PERSONAL),
        };
        await Onyx.merge(ONYXKEYS.BANK_ACCOUNT_LIST, bankAccountList);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(true);
    });

    it('still shows the task when the only OPEN bank account is a BUSINESS account', async () => {
        await setPolicies(makePolicy({id: 'policy1', reimbursement: {enabled: true}}));
        const bankAccountList: BankAccountList = {
            '100': makeBankAccount(100, CONST.BANK_ACCOUNT.STATE.OPEN, CONST.BANK_ACCOUNT.TYPE.BUSINESS),
        };
        await Onyx.merge(ONYXKEYS.BANK_ACCOUNT_LIST, bankAccountList);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(true);
    });

    it('hides the task when the only reimbursement-enabled policy is pending deletion', async () => {
        await setPolicies(
            makePolicy({
                id: 'policy1',
                reimbursement: {enabled: true},
                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
            }),
        );
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(false);
    });

    it('hides the task when there are no policies at all', async () => {
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveAddDepositAccount());

        expect(result.current.shouldShowAddDepositAccount).toBe(false);
    });
});

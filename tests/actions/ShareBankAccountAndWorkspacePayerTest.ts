import Onyx from 'react-native-onyx';
import {shareBankAccount, shareBankAccountAndSetPayer} from '@libs/actions/BankAccounts';
import {setWorkspacePayer} from '@libs/actions/Policy/Policy';
import {makeRequestWithSideEffects, write} from '@libs/API';
import {SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

jest.mock('@libs/API', () => ({
    write: jest.fn(),
    makeRequestWithSideEffects: jest.fn(() => Promise.resolve({jsonCode: 200})),
}));

describe('actions/ShareBankAccountAndWorkspacePayer', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        return Onyx.clear().then(waitForBatchedUpdates);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('shareBankAccountAndSetPayer', () => {
        it('should call API.makeRequestWithSideEffects with ShareBankAccountAndUpdatePolicyReimburser command and correct parameters', async () => {
            const bankAccountID = 123;
            const shareeAccountID = 456;
            const policyID = 'policy_789';

            shareBankAccountAndSetPayer(bankAccountID, shareeAccountID, policyID);
            await waitForBatchedUpdates();

            expect(makeRequestWithSideEffects).toHaveBeenCalledWith(SIDE_EFFECT_REQUEST_COMMANDS.SHARE_BANK_ACCOUNT_AND_UPDATE_POLICY_REIMBURSER, {
                bankAccountID,
                shareeAccountID,
                policyID,
            });
        });
    });

    describe('shareBankAccount error surfacing', () => {
        it('should surface the server-provided error message verbatim when the request fails', async () => {
            const serverMessage = 'The recipient needs to validate their Expensify account before you can share this bank account.';
            (makeRequestWithSideEffects as jest.Mock).mockResolvedValueOnce({jsonCode: 402, message: serverMessage});

            shareBankAccount(123, ['unvalidated@example.com']);
            await waitForBatchedUpdates();

            const shareState: OnyxTypes.ShareBankAccount | undefined = await new Promise((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.SHARE_BANK_ACCOUNT,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value ?? undefined);
                    },
                });
            });

            expect(shareState?.isLoading).toBe(false);
            const errorMessages = Object.values(shareState?.errors ?? {});
            expect(errorMessages).toContain(serverMessage);
        });

        it('should fall back to the generic translation key when the server returns no message', async () => {
            (makeRequestWithSideEffects as jest.Mock).mockResolvedValueOnce({jsonCode: 500});

            shareBankAccount(123, ['someone@example.com']);
            await waitForBatchedUpdates();

            const shareState: OnyxTypes.ShareBankAccount | undefined = await new Promise((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.SHARE_BANK_ACCOUNT,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value ?? undefined);
                    },
                });
            });

            expect(shareState?.isLoading).toBe(false);
            expect(shareState?.errors).not.toBeNull();
            expect(Object.keys(shareState?.errors ?? {}).length).toBeGreaterThan(0);
        });
    });

    describe('setWorkspacePayer', () => {
        it('should call API.write with SetWorkspacePayer command and correct parameters', async () => {
            const policyID = 'policy_abc';
            const reimburserEmail = 'payer@example.com';

            setWorkspacePayer(policyID, reimburserEmail, undefined);
            await waitForBatchedUpdates();

            expect(write).toHaveBeenCalledWith(
                WRITE_COMMANDS.SET_WORKSPACE_PAYER,
                {
                    policyID,
                    reimburserEmail,
                },
                expect.objectContaining({
                    optimisticData: expect.arrayContaining([
                        expect.objectContaining({
                            onyxMethod: Onyx.METHOD.MERGE,
                            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                            value: expect.objectContaining({
                                reimburser: reimburserEmail,
                                achAccount: {reimburser: reimburserEmail},
                                errorFields: {reimburser: null},
                                pendingFields: {reimburser: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE},
                            }),
                        }),
                    ]),
                    successData: expect.arrayContaining([
                        expect.objectContaining({
                            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                            value: expect.objectContaining({
                                errorFields: {reimburser: null},
                                pendingFields: {reimburser: null},
                            }),
                        }),
                    ]),
                    failureData: expect.arrayContaining([
                        expect.objectContaining({
                            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                            value: expect.objectContaining({
                                // Error object shape from ErrorUtils.getMicroSecondOnyxErrorWithTranslationKey
                                errorFields: expect.objectContaining({
                                    reimburser: expect.anything(), // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- Jest matcher
                                }),
                                pendingFields: {reimburser: null},
                            }),
                        }),
                    ]),
                }),
            );
        });
    });
});

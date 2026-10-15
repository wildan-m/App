import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {getSubmitParameters, getValidationErrors} from '@libs/ABAWithdrawalAccountUtils';

import INPUT_IDS from '@src/types/form/ABAWithdrawalAccountForm';

// Echo the translation key so assertions can check which error was picked
const translate: LocalizedTranslate = (path, ...parameters): string => (parameters.length > 0 ? `${path}:${parameters.join(',')}` : path);

const VALID_VALUES = {
    [INPUT_IDS.BSB_NUMBER]: '123-456',
    [INPUT_IDS.ACCOUNT_NUMBER]: '12345678',
    [INPUT_IDS.BANK_USER_ID]: '123456',
    [INPUT_IDS.COMPANY_NAME]: 'Expensify Pty Ltd',
    [INPUT_IDS.INCLUDE_SELF_BALANCING_TRANSACTION]: false,
};

describe('ABAWithdrawalAccountUtils', () => {
    describe('getValidationErrors', () => {
        it('flags every required text field when the form is empty', () => {
            // Given an ABA form submitted without any values
            const values = {...VALID_VALUES, bsbNumber: '', accountNumber: '', bankUserID: '', companyName: ''};

            // When the form is validated
            const errors = getValidationErrors(values, translate);

            // Then each of the four text inputs reports an error, so the user knows what to fill in
            expect(Object.keys(errors).sort()).toEqual([INPUT_IDS.ACCOUNT_NUMBER, INPUT_IDS.BANK_USER_ID, INPUT_IDS.BSB_NUMBER, INPUT_IDS.COMPANY_NAME].sort());
        });

        it.each(['123-456', '123456'])('accepts the BSB %s with or without the hyphen', (bsbNumber) => {
            // Given a BSB in either of the formats Classic accepts
            const values = {...VALID_VALUES, bsbNumber};

            // When the form is validated
            const errors = getValidationErrors(values, translate);

            // Then no error is shown for it
            expect(errors[INPUT_IDS.BSB_NUMBER]).toBeUndefined();
        });

        it.each(['12345', '1234567', 'abc123'])('rejects the BSB %s', (bsbNumber) => {
            // Given a BSB that is too short, too long or not numeric
            const values = {...VALID_VALUES, bsbNumber};

            // When the form is validated
            const errors = getValidationErrors(values, translate);

            // Then the BSB input shows its format error
            expect(errors[INPUT_IDS.BSB_NUMBER]).toBe('bankAccount.abaWithdrawal.error.bsbNumber');
        });

        it.each(['1234', '1234567890', 'abcde'])('rejects the account number %s', (accountNumber) => {
            // Given an account number outside the 5 to 9 digit range Classic allows
            const values = {...VALID_VALUES, accountNumber};

            // When the form is validated
            const errors = getValidationErrors(values, translate);

            // Then the account number input shows its format error
            expect(errors[INPUT_IDS.ACCOUNT_NUMBER]).toBe('bankAccount.abaWithdrawal.error.accountNumber');
        });

        it.each(['1234567', 'abc'])('rejects the bank user identification number %s', (bankUserID) => {
            // Given a bank user ID longer than 6 digits or not numeric
            const values = {...VALID_VALUES, bankUserID};

            // When the form is validated
            const errors = getValidationErrors(values, translate);

            // Then the bank user ID input shows its format error
            expect(errors[INPUT_IDS.BANK_USER_ID]).toBe('bankAccount.abaWithdrawal.error.bankUserID');
        });

        it('returns no errors for valid details', () => {
            // Given a fully valid ABA form
            // When the form is validated
            const errors = getValidationErrors(VALID_VALUES, translate);

            // Then it can be submitted
            expect(errors).toEqual({});
        });
    });

    describe('getSubmitParameters', () => {
        it('sends the BSB without its hyphen along with the workspace', () => {
            // Given valid details entered with a hyphenated BSB from a workspace
            const values = {...VALID_VALUES, includeSelfBalancingTransaction: true};

            // When the API parameters are built
            const parameters = getSubmitParameters(values, '1A2B3C');

            // Then the BSB is sent as six digits and the workspace is linked
            expect(parameters).toEqual({
                policyID: '1A2B3C',
                bsbNumber: '123456',
                accountNumber: '12345678',
                bankUserID: '123456',
                companyName: 'Expensify Pty Ltd',
                includeSelfBalancingTransaction: true,
            });
        });
    });
});

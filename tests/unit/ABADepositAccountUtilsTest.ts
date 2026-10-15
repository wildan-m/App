import type {LocaleContextProps} from '@components/LocaleContextProvider';

import {getSubmitParameters, getValidationErrors} from '@libs/ABADepositAccountUtils';

import type {ABADepositAccountForm} from '@src/types/form';
import INPUT_IDS from '@src/types/form/ABADepositAccountForm';

// Echoes the key back so assertions can tell the different failure messages apart.
const translate: LocaleContextProps['translate'] = (path, ...parameters): string => (parameters.length > 0 ? `${path}:${parameters.join(',')}` : path);

const VALID_VALUES: ABADepositAccountForm = {
    [INPUT_IDS.BSB_NUMBER]: '123-456',
    [INPUT_IDS.ACCOUNT_NUMBER]: '12345678',
    [INPUT_IDS.FIRST_NAME]: 'Jane',
    [INPUT_IDS.LAST_NAME]: 'Citizen',
    [INPUT_IDS.ADDRESS_STREET]: '1 George Street',
    [INPUT_IDS.ADDRESS_CITY]: 'Sydney',
};

describe('ABADepositAccountUtils', () => {
    describe('getValidationErrors', () => {
        it('accepts valid details', () => {
            expect(getValidationErrors(VALID_VALUES, translate)).toEqual({});
        });

        it('requires every field', () => {
            const emptyValues: ABADepositAccountForm = {
                [INPUT_IDS.BSB_NUMBER]: '',
                [INPUT_IDS.ACCOUNT_NUMBER]: '',
                [INPUT_IDS.FIRST_NAME]: '',
                [INPUT_IDS.LAST_NAME]: '',
                [INPUT_IDS.ADDRESS_STREET]: '',
                [INPUT_IDS.ADDRESS_CITY]: '',
            };

            const errors = getValidationErrors(emptyValues, translate);

            for (const inputID of Object.values(INPUT_IDS)) {
                expect(errors[inputID]).toBe('common.error.fieldRequired');
            }
        });

        it.each(['12-3456', 'abc-def', '123456', '1234-567'])('rejects the BSB number %s', (bsbNumber) => {
            const errors = getValidationErrors({...VALID_VALUES, [INPUT_IDS.BSB_NUMBER]: bsbNumber}, translate);
            expect(errors[INPUT_IDS.BSB_NUMBER]).toBe('bankAccount.abaDeposit.error.bsbNumber');
        });

        it.each(['1234', '1234567890', 'abcde'])('rejects the account number %s', (accountNumber) => {
            const errors = getValidationErrors({...VALID_VALUES, [INPUT_IDS.ACCOUNT_NUMBER]: accountNumber}, translate);
            expect(errors[INPUT_IDS.ACCOUNT_NUMBER]).toBe('bankAccount.abaDeposit.error.accountNumber');
        });

        it.each(['12345', '123456789'])('accepts the account number %s', (accountNumber) => {
            expect(getValidationErrors({...VALID_VALUES, [INPUT_IDS.ACCOUNT_NUMBER]: accountNumber}, translate)).toEqual({});
        });
    });

    describe('getSubmitParameters', () => {
        it('sends the trimmed details for the workspace that reimburses the account', () => {
            expect(getSubmitParameters({...VALID_VALUES, [INPUT_IDS.FIRST_NAME]: ' Jane '}, 'policy1')).toEqual({
                policyID: 'policy1',
                bsbNumber: '123-456',
                accountNumber: '12345678',
                firstName: 'Jane',
                lastName: 'Citizen',
                addressStreet: '1 George Street',
                addressCity: 'Sydney',
            });
        });
    });
});

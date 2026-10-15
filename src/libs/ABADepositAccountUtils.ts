import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/ABADepositAccountForm';

import type {CreateDepositABAAccountParams} from './API/parameters';

import {getFieldRequiredErrors} from './ValidationUtils';

type ABADepositAccountFormValues = FormOnyxValues<typeof ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM>;

/** Same formats Classic accepts for an Australian deposit account */
const BSB_NUMBER_REGEX = /^\d{3}-\d{3}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{5,9}$/;

function getValidationErrors(values: ABADepositAccountFormValues, translate: LocalizedTranslate): FormInputErrors<typeof ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM> {
    const errors = getFieldRequiredErrors<typeof ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM>(values, Object.values(INPUT_IDS), translate);

    const bsbNumber = values[INPUT_IDS.BSB_NUMBER]?.trim();
    if (bsbNumber && !BSB_NUMBER_REGEX.test(bsbNumber)) {
        errors[INPUT_IDS.BSB_NUMBER] = translate('bankAccount.abaDeposit.error.bsbNumber');
    }

    const accountNumber = values[INPUT_IDS.ACCOUNT_NUMBER]?.trim();
    if (accountNumber && !ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
        errors[INPUT_IDS.ACCOUNT_NUMBER] = translate('bankAccount.abaDeposit.error.accountNumber');
    }

    return errors;
}

function getSubmitParameters(values: ABADepositAccountFormValues, policyID: string): CreateDepositABAAccountParams {
    return {
        policyID,
        bsbNumber: values[INPUT_IDS.BSB_NUMBER].trim(),
        accountNumber: values[INPUT_IDS.ACCOUNT_NUMBER].trim(),
        firstName: values[INPUT_IDS.FIRST_NAME].trim(),
        lastName: values[INPUT_IDS.LAST_NAME].trim(),
        addressStreet: values[INPUT_IDS.ADDRESS_STREET].trim(),
        addressCity: values[INPUT_IDS.ADDRESS_CITY].trim(),
    };
}

export {getValidationErrors, getSubmitParameters};

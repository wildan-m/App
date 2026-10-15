import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import type ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/ABAWithdrawalAccountForm';

import {getFieldRequiredErrors} from './ValidationUtils';

type ABAWithdrawalAccountFormValues = FormOnyxValues<typeof ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM>;

/** Same field rules as the ABA bank account setup in Classic */
function getValidationErrors(values: ABAWithdrawalAccountFormValues, translate: LocalizedTranslate): FormInputErrors<typeof ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM> {
    const errors = getFieldRequiredErrors<typeof ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM>(
        values,
        [INPUT_IDS.BSB_NUMBER, INPUT_IDS.ACCOUNT_NUMBER, INPUT_IDS.BANK_USER_ID, INPUT_IDS.COMPANY_NAME],
        translate,
    );

    const bsbNumber = values[INPUT_IDS.BSB_NUMBER]?.trim();
    if (bsbNumber && !CONST.REGEX.ABA_BSB_NUMBER.test(bsbNumber)) {
        errors[INPUT_IDS.BSB_NUMBER] = translate('bankAccount.abaWithdrawal.error.bsbNumber');
    }

    const accountNumber = values[INPUT_IDS.ACCOUNT_NUMBER]?.trim();
    if (accountNumber && !CONST.REGEX.ABA_ACCOUNT_NUMBER.test(accountNumber)) {
        errors[INPUT_IDS.ACCOUNT_NUMBER] = translate('bankAccount.abaWithdrawal.error.accountNumber');
    }

    const bankUserID = values[INPUT_IDS.BANK_USER_ID]?.trim();
    if (bankUserID && !CONST.REGEX.ABA_BANK_USER_ID.test(bankUserID)) {
        errors[INPUT_IDS.BANK_USER_ID] = translate('bankAccount.abaWithdrawal.error.bankUserID');
    }

    return errors;
}

/** The API expects the BSB as six digits, so the optional hyphen is dropped */
function getSubmitParameters(values: ABAWithdrawalAccountFormValues, policyID: string | undefined) {
    return {
        policyID,
        bsbNumber: values[INPUT_IDS.BSB_NUMBER].trim().replace('-', ''),
        accountNumber: values[INPUT_IDS.ACCOUNT_NUMBER].trim(),
        bankUserID: values[INPUT_IDS.BANK_USER_ID].trim(),
        companyName: values[INPUT_IDS.COMPANY_NAME].trim(),
        includeSelfBalancingTransaction: !!values[INPUT_IDS.INCLUDE_SELF_BALANCING_TRANSACTION],
    };
}

export {getValidationErrors, getSubmitParameters};

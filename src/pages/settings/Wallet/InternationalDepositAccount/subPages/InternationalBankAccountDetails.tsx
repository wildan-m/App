import FormProvider from '@components/Form/FormProvider';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';

import useInternationalBankAccountFormSubmit from '@hooks/useInternationalBankAccountFormSubmit';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import InternationalBankAccountDetailsInputs from '@pages/settings/Wallet/InternationalDepositAccount/components/InternationalBankAccountDetailsInputs';
import type CustomSubPageProps from '@pages/settings/Wallet/InternationalDepositAccount/types';
import {getInternationalBankAccountDetailsErrors} from '@pages/settings/Wallet/InternationalDepositAccount/utils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useCallback} from 'react';

const STEP_FIELDS = [CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.IBAN, CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.SWIFT_CODE];

function InternationalBankAccountDetails({isEditing, onNext, formValues}: CustomSubPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const handleSubmit = useInternationalBankAccountFormSubmit({
        fieldIds: STEP_FIELDS,
        onNext,
        shouldSaveDraft: true,
    });

    const validate = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.INTERNATIONAL_BANK_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.INTERNATIONAL_BANK_ACCOUNT_FORM> => {
            return getInternationalBankAccountDetailsErrors({iban: values.iban, swiftCode: values.swiftCode}, translate);
        },
        [translate],
    );

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.INTERNATIONAL_BANK_ACCOUNT_FORM}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            onSubmit={handleSubmit}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            enabledWhenOffline
        >
            <InternationalBankAccountDetailsInputs
                ibanDefaultValue={formValues.iban ?? formValues.accountNumber}
                swiftCodeDefaultValue={formValues.swiftCode}
                shouldSaveDraft={!isEditing}
            />
        </FormProvider>
    );
}

InternationalBankAccountDetails.displayName = 'InternationalBankAccountDetails';

export default InternationalBankAccountDetails;

import FormProvider from '@components/Form/FormProvider';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePersonalBankAccountDetailsFormSubmit from '@hooks/usePersonalBankAccountDetailsFormSubmit';
import type {SubStepProps} from '@hooks/useSubStep/types';
import useThemeStyles from '@hooks/useThemeStyles';

import InternationalBankAccountDetailsInputs from '@pages/settings/Wallet/InternationalDepositAccount/components/InternationalBankAccountDetailsInputs';
import {getInternationalBankAccountDetailsErrors} from '@pages/settings/Wallet/InternationalDepositAccount/utils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.IBAN, CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.SWIFT_CODE] as const;

function InternationalBankAccountDetailsStep({onNext, isEditing}: SubStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [personalBankAccountDraft] = useOnyx(ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM_DRAFT);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM> => {
        return getInternationalBankAccountDetailsErrors({iban: values.iban, swiftCode: values.swiftCode}, translate);
    };

    const handleSubmit = usePersonalBankAccountDetailsFormSubmit({
        fieldIds: [...STEP_FIELDS],
        onNext,
        shouldSaveDraft: true,
    });

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM}
            onSubmit={handleSubmit}
            validate={validate}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            style={[styles.mh5, styles.flexGrow1]}
        >
            <InternationalBankAccountDetailsInputs
                ibanDefaultValue={personalBankAccountDraft?.iban}
                swiftCodeDefaultValue={personalBankAccountDraft?.swiftCode}
                shouldSaveDraft={!isEditing}
            />
        </FormProvider>
    );
}

InternationalBankAccountDetailsStep.displayName = 'InternationalBankAccountDetailsStep';

export default InternationalBankAccountDetailsStep;

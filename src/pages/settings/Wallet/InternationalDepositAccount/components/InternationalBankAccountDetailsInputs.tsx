import InputWrapper from '@components/Form/InputWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import getTextInputAutocorrectProps from '@libs/getTextInputAutocorrectProps';

import CONST from '@src/CONST';

import React from 'react';

type InternationalBankAccountDetailsInputsProps = {
    /** The IBAN saved in the draft of the flow that renders these inputs */
    ibanDefaultValue?: string;

    /** The SWIFT/BIC code saved in the draft of the flow that renders these inputs */
    swiftCodeDefaultValue?: string;

    /** Whether the values should be saved as draft values */
    shouldSaveDraft: boolean;
};

/**
 * The IBAN and SWIFT/BIC code inputs, shared by the USD and the international personal bank account flows.
 * The wrapping FormProvider is owned by the caller so that each flow saves to its own form.
 */
function InternationalBankAccountDetailsInputs({ibanDefaultValue, swiftCodeDefaultValue, shouldSaveDraft}: InternationalBankAccountDetailsInputsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {inputCallbackRef} = useAutoFocusInput();

    return (
        <>
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb3]}>{translate('addPersonalBankAccount.internationalBankAccountDetailsStepHeader')}</Text>
            <Text style={[styles.mb5, styles.textSupporting]}>{translate('addPersonalBankAccount.internationalBankAccountDetailsStepSubHeader')}</Text>
            <InputWrapper
                InputComponent={TextInput}
                ref={inputCallbackRef}
                inputID={CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.IBAN}
                label={translate('addPersonalBankAccount.iban')}
                aria-label={translate('addPersonalBankAccount.iban')}
                role={CONST.ROLE.PRESENTATION}
                containerStyles={[styles.mb6]}
                defaultValue={ibanDefaultValue}
                shouldSaveDraft={shouldSaveDraft}
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                {...getTextInputAutocorrectProps()}
            />
            <InputWrapper
                InputComponent={TextInput}
                inputID={CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.SWIFT_CODE}
                label={translate('addPersonalBankAccount.swiftCode')}
                aria-label={translate('addPersonalBankAccount.swiftCode')}
                role={CONST.ROLE.PRESENTATION}
                containerStyles={[styles.mb6]}
                defaultValue={swiftCodeDefaultValue}
                shouldSaveDraft={shouldSaveDraft}
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                {...getTextInputAutocorrectProps()}
            />
        </>
    );
}

InternationalBankAccountDetailsInputs.displayName = 'InternationalBankAccountDetailsInputs';

export default InternationalBankAccountDetailsInputs;

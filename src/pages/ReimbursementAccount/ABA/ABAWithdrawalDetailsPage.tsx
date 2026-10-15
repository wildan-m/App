import CheckboxWithLabel from '@components/CheckboxWithLabel';
import ConfirmationPage from '@components/ConfirmationPage';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getSubmitParameters, getValidationErrors} from '@libs/ABAWithdrawalAccountUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReimbursementAccountNavigatorParamList} from '@libs/Navigation/types';

import {createWithdrawalABAAccount, resetABAWithdrawalAccountSetup} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/ABAWithdrawalAccountForm';

import React, {useEffect} from 'react';

type ABAWithdrawalDetailsPageProps = PlatformStackScreenProps<ReimbursementAccountNavigatorParamList, typeof SCREENS.REIMBURSEMENT_ACCOUNT_ABA_WITHDRAWAL_DETAILS>;

function ABAWithdrawalDetailsPage({route}: ABAWithdrawalDetailsPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const [isAccountCreated = false] = useOnyx(ONYXKEYS.RAM_ONLY_IS_ABA_WITHDRAWAL_ACCOUNT_CREATED);

    useEffect(() => {
        resetABAWithdrawalAccountSetup();
    }, []);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM> =>
        getValidationErrors(values, translate);

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM>) => {
        createWithdrawalABAAccount(getSubmitParameters(values, policyID));
    };

    // The setup flow is opened from the workspace workflows or the wallet, and closing it returns the user there
    const exitFlow = () => {
        resetABAWithdrawalAccountSetup();
        Navigation.dismissModal();
    };

    return (
        <ScreenWrapper
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            testID={ABAWithdrawalDetailsPage.displayName}
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                onBackButtonPress={isAccountCreated ? exitFlow : () => Navigation.goBack()}
            />
            {isAccountCreated ? (
                <ScrollView contentContainerStyle={styles.flexGrow1}>
                    <ConfirmationPage
                        heading={translate('addPersonalBankAccountPage.successTitle')}
                        description={translate('addPersonalBankAccountPage.successMessage')}
                        shouldShowButton
                        buttonText={translate('common.continue')}
                        onButtonPress={exitFlow}
                        containerStyle={styles.h100}
                    />
                </ScrollView>
            ) : (
                <FormProvider
                    formID={ONYXKEYS.FORMS.ABA_WITHDRAWAL_ACCOUNT_FORM}
                    submitButtonText={translate('common.next')}
                    onSubmit={submit}
                    validate={validate}
                    style={[styles.flexGrow1, styles.mh5]}
                >
                    <Text style={[styles.textHeadlineLineHeightXXL, styles.mb6]}>{translate('bankAccount.abaWithdrawal.detailsTitle')}</Text>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.BSB_NUMBER}
                        label={translate('bankAccount.abaWithdrawal.bsbNumber')}
                        aria-label={translate('bankAccount.abaWithdrawal.bsbNumber')}
                        role={CONST.ROLE.PRESENTATION}
                        inputMode={CONST.INPUT_MODE.NUMERIC}
                        containerStyles={[styles.mb6]}
                        forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                        shouldSaveDraft
                    />
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.ACCOUNT_NUMBER}
                        label={translate('bankAccount.abaWithdrawal.accountNumber')}
                        aria-label={translate('bankAccount.abaWithdrawal.accountNumber')}
                        role={CONST.ROLE.PRESENTATION}
                        inputMode={CONST.INPUT_MODE.NUMERIC}
                        containerStyles={[styles.mb6]}
                        forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                        shouldSaveDraft
                    />
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.BANK_USER_ID}
                        label={translate('bankAccount.abaWithdrawal.bankUserID')}
                        aria-label={translate('bankAccount.abaWithdrawal.bankUserID')}
                        role={CONST.ROLE.PRESENTATION}
                        inputMode={CONST.INPUT_MODE.NUMERIC}
                        containerStyles={[styles.mb6]}
                        forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                        shouldSaveDraft
                    />
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.COMPANY_NAME}
                        label={translate('bankAccount.abaWithdrawal.companyName')}
                        aria-label={translate('bankAccount.abaWithdrawal.companyName')}
                        role={CONST.ROLE.PRESENTATION}
                        containerStyles={[styles.mb6]}
                        shouldSaveDraft
                    />
                    <InputWrapper
                        InputComponent={CheckboxWithLabel}
                        inputID={INPUT_IDS.INCLUDE_SELF_BALANCING_TRANSACTION}
                        label={translate('bankAccount.abaWithdrawal.includeSelfBalancingTransaction')}
                        aria-label={translate('bankAccount.abaWithdrawal.includeSelfBalancingTransaction')}
                        defaultValue={false}
                        shouldSaveDraft
                    />
                </FormProvider>
            )}
        </ScreenWrapper>
    );
}

ABAWithdrawalDetailsPage.displayName = 'ABAWithdrawalDetailsPage';

export default ABAWithdrawalDetailsPage;

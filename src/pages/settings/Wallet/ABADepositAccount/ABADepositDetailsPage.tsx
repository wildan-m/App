import ActivityIndicator from '@components/ActivityIndicator';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ConfirmationPage from '@components/ConfirmationPage';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useABADepositPolicyID from '@hooks/useABADepositPolicyID';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getSubmitParameters, getValidationErrors} from '@libs/ABADepositAccountUtils';
import Navigation from '@libs/Navigation/Navigation';

import {createDepositABAAccount, openDepositAccountSetup, resetABADepositAccountSetup} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/ABADepositAccountForm';
import type {PersonalBankAccount} from '@src/types/onyx';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import type {OnyxEntry} from 'react-native-onyx';

import React, {useEffect} from 'react';
import {View} from 'react-native';

const shouldShowSuccessSelector = (personalBankAccount: OnyxEntry<PersonalBankAccount>) => personalBankAccount?.shouldShowSuccess;

function ABADepositDetailsPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const abaPolicyID = useABADepositPolicyID();
    const [isLoadingDepositAccountSetup, isLoadingDepositAccountSetupMetadata] = useOnyx(ONYXKEYS.RAM_ONLY_IS_LOADING_DEPOSIT_ACCOUNT_SETUP);
    const [shouldShowSuccess = false] = useOnyx(ONYXKEYS.PERSONAL_BANK_ACCOUNT, {selector: shouldShowSuccessSelector});

    useEffect(() => {
        resetABADepositAccountSetup();
    }, []);

    // The country step loads the workspaces' withdrawal accounts, so this only fetches them when the page is opened directly.
    const shouldLoadDepositAccountSetup = !isLoadingOnyxValue(isLoadingDepositAccountSetupMetadata) && isLoadingDepositAccountSetup === undefined;
    useEffect(() => {
        if (!shouldLoadDepositAccountSetup) {
            return;
        }
        openDepositAccountSetup();
    }, [shouldLoadDepositAccountSetup]);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM> =>
        getValidationErrors(values, translate);

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM>) => {
        if (!abaPolicyID) {
            return;
        }
        createDepositABAAccount(getSubmitParameters(values, abaPolicyID));
    };

    const exitFlow = () => {
        resetABADepositAccountSetup();
        Navigation.dismissModal();
    };

    const isLoadingPolicies = !abaPolicyID && isLoadingDepositAccountSetup !== false;

    const renderContent = () => {
        if (shouldShowSuccess) {
            return (
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
            );
        }
        if (isLoadingPolicies) {
            return (
                <View style={[styles.flex1, styles.fullScreenLoading]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            );
        }
        return (
            <FormProvider
                formID={ONYXKEYS.FORMS.ABA_DEPOSIT_ACCOUNT_FORM}
                submitButtonText={translate('common.next')}
                onSubmit={submit}
                validate={validate}
                style={[styles.flexGrow1, styles.mh5]}
            >
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mb6]}>{translate('addPersonalBankAccount.accountDetailsStepHeader')}</Text>
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.BSB_NUMBER}
                    label={translate('bankAccount.abaDeposit.bsbNumber')}
                    aria-label={translate('bankAccount.abaDeposit.bsbNumber')}
                    role={CONST.ROLE.PRESENTATION}
                    containerStyles={[styles.mb6]}
                    forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.ACCOUNT_NUMBER}
                    label={translate('bankAccount.accountNumber')}
                    aria-label={translate('bankAccount.accountNumber')}
                    role={CONST.ROLE.PRESENTATION}
                    inputMode={CONST.INPUT_MODE.NUMERIC}
                    containerStyles={[styles.mb6]}
                    forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.FIRST_NAME}
                    label={translate('common.firstName')}
                    aria-label={translate('common.firstName')}
                    role={CONST.ROLE.PRESENTATION}
                    containerStyles={[styles.mb6]}
                    forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.LAST_NAME}
                    label={translate('common.lastName')}
                    aria-label={translate('common.lastName')}
                    role={CONST.ROLE.PRESENTATION}
                    containerStyles={[styles.mb6]}
                    forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.ADDRESS_STREET}
                    label={translate('bankAccount.abaDeposit.billingAddress')}
                    aria-label={translate('bankAccount.abaDeposit.billingAddress')}
                    role={CONST.ROLE.PRESENTATION}
                    containerStyles={[styles.mb6]}
                    forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.ADDRESS_CITY}
                    label={translate('common.city')}
                    aria-label={translate('common.city')}
                    role={CONST.ROLE.PRESENTATION}
                    containerStyles={[styles.mb6]}
                    shouldSaveDraft
                />
            </FormProvider>
        );
    };

    return (
        <ScreenWrapper
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            testID="ABADepositDetailsPage"
        >
            <FullPageNotFoundView shouldShow={!shouldShowSuccess && !isLoadingPolicies && !abaPolicyID}>
                <HeaderWithBackButtonAndTitle
                    title={translate('bankAccount.addBankAccount')}
                    onBackButtonPress={shouldShowSuccess ? exitFlow : () => Navigation.goBack()}
                />
                {renderContent()}
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

ABADepositDetailsPage.displayName = 'ABADepositDetailsPage';

export default ABADepositDetailsPage;

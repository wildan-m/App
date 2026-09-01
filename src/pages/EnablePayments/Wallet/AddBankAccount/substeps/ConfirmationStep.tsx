import Button from '@components/ButtonComposed';
import DotIndicatorMessage from '@components/DotIndicatorMessage';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {getFormattedAddress} from '@libs/PersonalDetailsUtils';

import useIsBankAccountAdded from '@pages/EnablePayments/Wallet/utils/useIsBankAccountAdded';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/PersonalBankAccountForm';

import React from 'react';
import {View} from 'react-native';

type ConfirmationStepProps = SubPageProps;

const BANK_INFO_STEP_KEYS = INPUT_IDS.BANK_INFO_STEP;
const BANK_INFO_STEP_INDEXES = CONST.WALLET.SUBSTEP_INDEXES.BANK_ACCOUNT;

function ConfirmationStep({onNext, onMove}: ConfirmationStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {isOffline} = useNetwork();
    const [personalBankAccountDraft] = useOnyx(ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM_DRAFT);
    const [personalBankAccount] = useOnyx(ONYXKEYS.PERSONAL_BANK_ACCOUNT);
    const [privatePersonalDetails] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);
    const {isBankAccountAdded, addedBankAccount} = useIsBankAccountAdded();

    const isLoading = personalBankAccount?.isLoading ?? false;
    const error = getLatestErrorMessage(personalBankAccount ?? {});

    const bankName = personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.BANK_NAME] ?? addedBankAccount?.title;
    const accountNumber = personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.ACCOUNT_NUMBER] ?? addedBankAccount?.accountData?.accountNumber ?? '';

    // The address the user just entered wins over the one saved on the profile, which is what gets submitted when the
    // address sub-page is skipped.
    const draftAddress = [
        personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.STREET],
        personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.STREET_SECOND],
        personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.CITY],
        personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.STATE],
        personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.ZIP_CODE],
        personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.COUNTRY],
    ]
        .filter((addressPart) => !!addressPart)
        .join(', ');
    const address = personalBankAccountDraft?.[BANK_INFO_STEP_KEYS.STREET] ? draftAddress : getFormattedAddress(privatePersonalDetails);

    const handleModifyAccountNumbers = () => {
        onMove(BANK_INFO_STEP_INDEXES.ACCOUNT_NUMBERS);
    };

    const handleModifyAddress = () => {
        onMove(BANK_INFO_STEP_INDEXES.ADDRESS);
    };

    return (
        <ScrollView
            style={styles.pt0}
            contentContainerStyle={styles.flexGrow1}
            addBottomSafeAreaPadding={!isOffline}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.ph5]}>{translate('walletPage.confirmYourBankAccount')}</Text>
            <Text style={[styles.mt3, styles.mb3, styles.ph5, styles.textSupporting]}>{translate('bankAccount.letsDoubleCheck')}</Text>
            <MenuItemWithTopDescription
                description={bankName}
                title={`${translate('bankAccount.accountEnding')} ${accountNumber.slice(-4)}`}
                shouldShowRightIcon={!isBankAccountAdded}
                interactive={!isBankAccountAdded}
                onPress={handleModifyAccountNumbers}
            />
            {!!address && (
                <MenuItemWithTopDescription
                    description={translate('personalInfoStep.address')}
                    title={address}
                    shouldShowRightIcon={!isBankAccountAdded}
                    interactive={!isBankAccountAdded}
                    onPress={handleModifyAddress}
                />
            )}
            <View style={[styles.ph5, styles.pb5, styles.flexGrow1, styles.justifyContentEnd]}>
                {!!error && error.length > 0 && (
                    <DotIndicatorMessage
                        textStyles={[styles.formError]}
                        type="error"
                        messages={{error}}
                    />
                )}
                <Button
                    isLoading={isLoading}
                    isDisabled={isLoading || isOffline}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    style={[styles.w100]}
                    onPress={onNext}
                >
                    <Button.Text>{translate('common.confirm')}</Button.Text>
                </Button>
            </View>
        </ScrollView>
    );
}

export default ConfirmationStep;

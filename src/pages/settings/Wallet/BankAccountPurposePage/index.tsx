import CollapsibleHeaderOnKeyboardGroup from '@components/CollapsibleHeaderOnKeyboard/Group';
import CollapsibleHeaderOnKeyboardGroupMember from '@components/CollapsibleHeaderOnKeyboard/GroupMember';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';

import Navigation from '@navigation/Navigation';

import AUReimbursementIntentPage from '@pages/ReimbursementAccount/ABA/AUReimbursementIntentPage';

import {startWithdrawalAccountSetupForCountry} from '@userActions/ReimbursementAccount';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React, {useState} from 'react';

import BankAccountPurpose from './substeps/BankAccountPurpose';
import CountrySelection from './substeps/CountrySelection';

function BankAccountPurposePage() {
    const {translate} = useLocalize();
    const [showCountrySelection, setShowCountrySelection] = useState(false);
    const [showAUReimbursementIntent, setShowAUReimbursementIntent] = useState(false);

    const showCountrySelectionStep = () => {
        setShowCountrySelection(true);
    };

    const handleBackButtonPress = () => {
        if (showAUReimbursementIntent) {
            setShowAUReimbursementIntent(false);
        } else if (showCountrySelection) {
            setShowCountrySelection(false);
        } else {
            Navigation.goBack();
        }
    };

    const renderStep = () => {
        if (showAUReimbursementIntent) {
            return (
                <AUReimbursementIntentPage
                    onPayViaExpensify={() => startWithdrawalAccountSetupForCountry(CONST.COUNTRY.AU)}
                    onPayViaABA={() => Navigation.navigate(ROUTES.BANK_ACCOUNT_ABA_WITHDRAWAL_DETAILS.getRoute())}
                />
            );
        }
        if (showCountrySelection) {
            return <CountrySelection onAustraliaSelected={() => setShowAUReimbursementIntent(true)} />;
        }
        return <BankAccountPurpose showCountrySelectionStep={showCountrySelectionStep} />;
    };

    return (
        <ScreenWrapper
            shouldEnablePickerAvoiding={false}
            shouldShowOfflineIndicator={false}
            testID={BankAccountPurposePage.displayName}
        >
            <CollapsibleHeaderOnKeyboardGroup>
                <CollapsibleHeaderOnKeyboardGroupMember>
                    <HeaderWithBackButton
                        title={translate('bankAccount.addBankAccount')}
                        onBackButtonPress={handleBackButtonPress}
                        shouldDisplayHelpButton={false}
                    />
                </CollapsibleHeaderOnKeyboardGroupMember>
                {renderStep()}
            </CollapsibleHeaderOnKeyboardGroup>
        </ScreenWrapper>
    );
}

BankAccountPurposePage.displayName = 'BankAccountPurposePage';

export default BankAccountPurposePage;

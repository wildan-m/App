import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import CountryFullStep from '@components/SubStepForms/CountryFullStep';

import useLocalize from '@hooks/useLocalize';

import Navigation from '@libs/Navigation/Navigation';

import AUReimbursementIntentPage from '@pages/ReimbursementAccount/ABA/AUReimbursementIntentPage';
import type NonUSDPageProps from '@pages/ReimbursementAccount/NonUSD/types';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React, {useState} from 'react';

function Country({onBackButtonPress, onSubmit, stepNames, policyID, currency, isComingFromExpensifyCard}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const [shouldShowAUReimbursementIntent, setShouldShowAUReimbursementIntent] = useState(false);

    const submit = () => {
        // AUD workspaces can also pay outside Expensify with ABA files, so ask how they want to pay first.
        // The Expensify Card needs a fully verified account, so that flow skips the choice.
        if (currency === CONST.CURRENCY.AUD && !!policyID && !isComingFromExpensifyCard) {
            setShouldShowAUReimbursementIntent(true);
            return;
        }
        onSubmit();
    };

    if (shouldShowAUReimbursementIntent) {
        return (
            <InteractiveStepWrapper
                wrapperID="AUReimbursementIntentStep"
                handleBackButtonPress={() => setShouldShowAUReimbursementIntent(false)}
                headerTitle={translate('bankAccount.addBankAccount')}
                stepNames={stepNames}
                startStepIndex={0}
            >
                <AUReimbursementIntentPage
                    onPayViaExpensify={onSubmit}
                    onPayViaABA={() => Navigation.navigate(ROUTES.BANK_ACCOUNT_ABA_WITHDRAWAL_DETAILS.getRoute(policyID))}
                />
            </InteractiveStepWrapper>
        );
    }

    return (
        <CountryFullStep
            onBackButtonPress={onBackButtonPress}
            onSubmit={submit}
            isComingFromExpensifyCard={isComingFromExpensifyCard}
            stepNames={stepNames ?? []}
            policyID={policyID}
        />
    );
}

export default Country;

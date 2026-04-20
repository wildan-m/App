import React from 'react';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WalletExpensifyCardSpendRulesNestedParamList} from '@libs/Navigation/types';
import SpendRulePageBase from '@pages/workspace/rules/SpendRules/SpendRulePageBase';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type WalletExpensifyCardSpendRulesRootPageProps = PlatformStackScreenProps<
    WalletExpensifyCardSpendRulesNestedParamList,
    typeof SCREENS.SETTINGS.WALLET.EXPENSIFY_CARD_SPEND_RULES_ROOT
>;

function WalletExpensifyCardSpendRulesRootPage({route}: WalletExpensifyCardSpendRulesRootPageProps) {
    const {policyID, ruleID} = route.params;
    const isNewRule = ruleID === ROUTES.NEW;

    return (
        <SpendRulePageBase
            policyID={policyID}
            ruleID={isNewRule ? undefined : ruleID}
            titleKey={isNewRule ? 'workspace.rules.merchantRules.addRuleTitle' : 'workspace.rules.spendRules.editRuleTitle'}
            testID="WalletExpensifyCardSpendRulesPage"
        />
    );
}

WalletExpensifyCardSpendRulesRootPage.displayName = 'WalletExpensifyCardSpendRulesRootPage';

export default WalletExpensifyCardSpendRulesRootPage;

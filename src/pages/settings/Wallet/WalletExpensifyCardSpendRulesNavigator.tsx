import React from 'react';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList, WalletExpensifyCardSpendRulesNestedParamList} from '@libs/Navigation/types';
import SpendRuleCardPage from '@pages/workspace/rules/SpendRules/SpendRuleCardPage';
import SpendRuleCategoryPage from '@pages/workspace/rules/SpendRules/SpendRuleCategoryPage';
import SpendRuleMaxAmountPage from '@pages/workspace/rules/SpendRules/SpendRuleMaxAmountPage';
import SpendRuleMerchantEditPage from '@pages/workspace/rules/SpendRules/SpendRuleMerchantEditPage';
import SpendRuleMerchantsPage from '@pages/workspace/rules/SpendRules/SpendRuleMerchantsPage';
import SCREENS from '@src/SCREENS';
import WalletExpensifyCardSpendRulesRootPage from './WalletExpensifyCardSpendRulesRootPage';

const Stack = createPlatformStackNavigator<WalletExpensifyCardSpendRulesNestedParamList>();

type WalletExpensifyCardSpendRulesNavigatorProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.WALLET.EXPENSIFY_CARD_SPEND_RULES>;

function WalletExpensifyCardSpendRulesNavigator({route}: WalletExpensifyCardSpendRulesNavigatorProps) {
    const {policyID, ruleID} = route.params;

    return (
        <Stack.Navigator
            initialRouteName={SCREENS.SETTINGS.WALLET.EXPENSIFY_CARD_SPEND_RULES_ROOT}
            screenOptions={{headerShown: false, animation: Animations.SLIDE_FROM_RIGHT}}
        >
            <Stack.Screen
                name={SCREENS.SETTINGS.WALLET.EXPENSIFY_CARD_SPEND_RULES_ROOT}
                component={WalletExpensifyCardSpendRulesRootPage}
                initialParams={{policyID, ruleID}}
            />
            <Stack.Screen
                name={SCREENS.WORKSPACE.RULES_SPEND_CARD}
                component={SpendRuleCardPage}
            />
            <Stack.Screen
                name={SCREENS.WORKSPACE.RULES_SPEND_CATEGORY}
                component={SpendRuleCategoryPage}
            />
            <Stack.Screen
                name={SCREENS.WORKSPACE.RULES_SPEND_MAX_AMOUNT}
                component={SpendRuleMaxAmountPage}
            />
            <Stack.Screen
                name={SCREENS.WORKSPACE.RULES_SPEND_MERCHANTS}
                component={SpendRuleMerchantsPage}
            />
            <Stack.Screen
                name={SCREENS.WORKSPACE.RULES_SPEND_MERCHANT_EDIT}
                component={SpendRuleMerchantEditPage}
            />
        </Stack.Navigator>
    );
}

WalletExpensifyCardSpendRulesNavigator.displayName = 'WalletExpensifyCardSpendRulesNavigator';

export default WalletExpensifyCardSpendRulesNavigator;

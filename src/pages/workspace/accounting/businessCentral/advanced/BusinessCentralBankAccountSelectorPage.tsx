/**
 * Shared bank account selector for the Business Central Advanced page. Both the reimbursement and the Expensify Card
 * settlements rows pick from the same company bank account list, so one screen serves both; the route's
 * `bankAccountSetting` parameter decides which setting the selection saves to.
 */
import BlockingView from '@components/BlockingViews/BlockingView';
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import type {SelectorType} from '@components/SelectionScreen';
import Text from '@components/Text';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useSelectionListSearch from '@hooks/useSelectionListSearch';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearBusinessCentralErrorField, updateBusinessCentralReimbursementBankAccount, updateBusinessCentralSettlementsBankAccount} from '@libs/actions/connections/BusinessCentral';
import {getLatestErrorField} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackRouteProp} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {settingsPendingAction} from '@libs/PolicyUtils';

import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';

import variables from '@styles/variables';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {BusinessCentralBankAccount} from '@src/types/onyx/Policy';

import {useRoute} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';

type BankAccountListItem = ListItem & {
    value: BusinessCentralBankAccount['id'];
};

function BusinessCentralBankAccountSelectorPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Telescope']);
    const policyID = policy?.id;
    const businessCentralConfig = policy?.connections?.businessCentral?.config;
    const businessCentralData = policy?.connections?.businessCentral?.data;
    const backPath = policyID ? ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_ADVANCED.getRoute(policyID) : undefined;

    const route = useRoute<PlatformStackRouteProp<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.ACCOUNTING.BUSINESS_CENTRAL_BANK_ACCOUNT_SELECTOR>>();
    const isReimbursement = route.params.bankAccountSetting === CONST.BUSINESS_CENTRAL_BANK_ACCOUNT_SETTING.REIMBURSEMENT;

    const settingKey = isReimbursement ? CONST.BUSINESS_CENTRAL_CONFIG.REIMBURSEMENT_BANK_ACCOUNT_ID : CONST.BUSINESS_CENTRAL_CONFIG.SETTLEMENTS_BANK_ACCOUNT_ID;
    const selectedBankAccountID = isReimbursement ? businessCentralConfig?.sync?.reimbursementBankAccountID : businessCentralConfig?.sync?.settlementsBankAccountID;
    const shouldBeBlocked = isReimbursement ? !businessCentralConfig?.sync?.syncReimbursedReports : !businessCentralConfig?.sync?.syncExpensifyCardSettlements;

    const data: BankAccountListItem[] =
        businessCentralData?.bankAccounts?.map((bankAccount) => ({
            value: bankAccount.id,
            text: bankAccount.name,
            alternateText: bankAccount.number,
            keyForList: bankAccount.id,
            isSelected: selectedBankAccountID === bankAccount.id,
        })) ?? [];
    const {filteredData, textInputOptions} = useSelectionListSearch(data);

    const headerContent = (
        <View>
            <Text style={[styles.ph5, styles.pb5]}>
                {translate(
                    isReimbursement ? 'workspace.businessCentral.advanced.reimbursementBankAccount.description' : 'workspace.businessCentral.advanced.settlementsBankAccount.description',
                )}
            </Text>
        </View>
    );

    const listEmptyContent = (
        <BlockingView
            icon={illustrations.Telescope}
            iconWidth={variables.emptyListIconWidth}
            iconHeight={variables.emptyListIconHeight}
            title={translate('workspace.businessCentral.advanced.noBankAccountsFound')}
            subtitle={translate('workspace.businessCentral.advanced.noBankAccountsFoundDescription')}
            containerStyle={styles.pb10}
        />
    );

    const selectBankAccount = (item: BankAccountListItem) => {
        if (item.value !== selectedBankAccountID && policyID) {
            if (isReimbursement) {
                updateBusinessCentralReimbursementBankAccount(policyID, item.value, selectedBankAccountID);
            } else {
                updateBusinessCentralSettlementsBankAccount(policyID, item.value, selectedBankAccountID);
            }
        }
        Navigation.goBack(backPath);
    };

    return (
        <SelectionScreen
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            shouldBeBlocked={shouldBeBlocked}
            displayName="BusinessCentralBankAccountSelectorPage"
            title={isReimbursement ? 'workspace.businessCentral.advanced.reimbursementBankAccount.label' : 'workspace.businessCentral.advanced.settlementsBankAccount.label'}
            data={filteredData}
            textInputOptions={textInputOptions}
            headerContent={headerContent}
            listEmptyContent={listEmptyContent}
            onSelectRow={(selection: SelectorType) => selectBankAccount(selection as BankAccountListItem)}
            shouldSingleExecuteRowSelect
            initiallyFocusedOptionKey={selectedBankAccountID}
            onBackButtonPress={() => Navigation.goBack(backPath)}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL}
            pendingAction={settingsPendingAction([settingKey], businessCentralConfig?.pendingFields)}
            errors={getLatestErrorField(businessCentralConfig, settingKey)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => policyID && clearBusinessCentralErrorField(policyID, settingKey)}
        />
    );
}

export default withPolicyConnections(BusinessCentralBankAccountSelectorPage);

import React from 'react';
import BlockingView from '@components/BlockingViews/BlockingView';
import RadioListItem from '@components/SelectionList/ListItem/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateConnectionConfig} from '@libs/actions/PolicyConnections';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import variables from '@styles/variables';
import {clearQBDErrorField} from '@userActions/Policy/Policy';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Account} from '@src/types/onyx/Policy';

type CardListItem = ListItem & {
    value: Account;
};

function QuickbooksDesktopTravelPayableAccountSelectPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Telescope']);

    const {payableAccounts} = policy?.connections?.quickbooksDesktop?.data ?? {};
    const qbdConfig = policy?.connections?.quickbooksDesktop?.config;

    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const data: CardListItem[] =
        payableAccounts?.map((account) => ({
            value: account,
            text: account.name,
            keyForList: account.name,
            isSelected: account.id === qbdConfig?.travelInvoicingPayableAccountID,
        })) ?? [];

    const selectAccount = (row: CardListItem) => {
        if (row.value.id !== qbdConfig?.travelInvoicingPayableAccountID) {
            updateConnectionConfig(
                policyID,
                CONST.POLICY.CONNECTIONS.NAME.QBD,
                {travelInvoicingPayableAccountID: row.value.id},
                {travelInvoicingPayableAccountID: qbdConfig?.travelInvoicingPayableAccountID},
            );
        }
        Navigation.goBack(ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_TRAVEL_INVOICING_CONFIGURATION.getRoute(policyID));
    };

    const getListEmptyContent = () => (
        <BlockingView
            icon={illustrations.Telescope}
            iconWidth={variables.emptyListIconWidth}
            iconHeight={variables.emptyListIconHeight}
            title={translate('workspace.qbd.noAccountsFound')}
            subtitle={translate('workspace.qbd.noAccountsFoundDescription')}
            containerStyle={styles.pb10}
        />
    );

    const listEmptyContent = getListEmptyContent();

    return (
        <SelectionScreen
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            displayName="QuickbooksDesktopTravelPayableAccountSelectPage"
            title="workspace.qbd.travelInvoicingPayableAccount"
            data={data}
            listItem={RadioListItem}
            onSelectRow={selectAccount}
            shouldSingleExecuteRowSelect
            initiallyFocusedOptionKey={data.find((mode) => mode.isSelected)?.keyForList}
            listEmptyContent={listEmptyContent}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.QBD}
            onBackButtonPress={() => Navigation.goBack(ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_TRAVEL_INVOICING_CONFIGURATION.getRoute(policyID))}
            pendingAction={settingsPendingAction([CONST.QUICKBOOKS_DESKTOP_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT], qbdConfig?.pendingFields)}
            errors={getLatestErrorField(qbdConfig, CONST.QUICKBOOKS_DESKTOP_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => clearQBDErrorField(policyID, CONST.QUICKBOOKS_DESKTOP_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
        />
    );
}

export default withPolicyConnections(QuickbooksDesktopTravelPayableAccountSelectPage);

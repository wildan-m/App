/**
 * Auto-sync settings for the Business Central connection: the daily sync toggle and, once enabled, the accounting
 * method that decides when out-of-pocket expenses export. The scope registers no separate accounting-method screen,
 * so the method picker lives inline on this page.
 */
import Accordion from '@components/Accordion';
import ConnectionLayout from '@components/ConnectionLayout';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useAccordionAnimation from '@hooks/useAccordionAnimation';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearBusinessCentralErrorField, updateBusinessCentralAccountingMethod, updateBusinessCentralAutoSync} from '@libs/actions/connections/BusinessCentral';
import {getLatestErrorField} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import {settingsPendingAction} from '@libs/PolicyUtils';

import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {BusinessCentralExport} from '@src/types/onyx/Policy';

import {CONST as COMMON_CONST} from 'expensify-common';
import React from 'react';
import {View} from 'react-native';

function BusinessCentralAutoSyncPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = policy?.id;
    const businessCentralConfig = policy?.connections?.businessCentral?.config;
    const autoSync = businessCentralConfig?.autoSync?.enabled ?? false;
    const accountingMethod = businessCentralConfig?.export?.accountingMethod ?? COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD.CASH;

    const {isAccordionExpanded, shouldAnimateAccordionSection} = useAccordionAnimation(autoSync);

    const accountingMethodItems = [
        {
            label: translate(`workspace.businessCentral.advanced.accountingMethods.values.${COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD.ACCRUAL}`),
            value: COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD.ACCRUAL,
        },
        {
            label: translate(`workspace.businessCentral.advanced.accountingMethods.values.${COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD.CASH}`),
            value: COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD.CASH,
        },
    ];

    const selectAccountingMethod = (value: string) => {
        const newAccountingMethod = value as BusinessCentralExport['accountingMethod'];
        if (newAccountingMethod === accountingMethod || !policyID) {
            return;
        }
        updateBusinessCentralAccountingMethod(policyID, newAccountingMethod, accountingMethod);
    };

    return (
        <ConnectionLayout
            displayName="BusinessCentralAutoSyncPage"
            headerTitle="common.settings"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={styles.pb2}
            titleStyle={styles.ph5}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL}
            onBackButtonPress={() => Navigation.goBack(policyID ? ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_ADVANCED.getRoute(policyID) : undefined)}
        >
            <ToggleSettingOptionRow
                title={translate('workspace.accounting.autoSync')}
                subtitle={translate('workspace.businessCentral.advanced.autoSyncDescription')}
                switchAccessibilityLabel={translate('workspace.businessCentral.advanced.autoSyncDescription')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.pv2, styles.mh5]}
                isActive={autoSync}
                onToggle={() => policyID && updateBusinessCentralAutoSync(policyID, !autoSync, autoSync)}
                pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.AUTO_SYNC], businessCentralConfig?.pendingFields)}
                errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.AUTO_SYNC)}
                onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.AUTO_SYNC)}
            />
            <Accordion
                isExpanded={isAccordionExpanded}
                isToggleTriggered={shouldAnimateAccordionSection}
            >
                <OfflineWithFeedback pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.ACCOUNTING_METHOD], businessCentralConfig?.pendingFields)}>
                    <View style={[styles.ph5, styles.pt3]}>
                        <Text style={[styles.textLabel, styles.textStrong, styles.lh16]}>{translate('workspace.businessCentral.advanced.accountingMethods.label')}</Text>
                        <Text style={[styles.mutedTextLabel, styles.pt2]}>{translate('workspace.businessCentral.advanced.accountingMethods.description')}</Text>
                    </View>
                    <RadioButtons
                        items={accountingMethodItems}
                        value={accountingMethod}
                        onSelect={selectAccountingMethod}
                    />
                    <Text style={[styles.mutedTextLabel, styles.ph5, styles.pt2]}>{translate(`workspace.businessCentral.advanced.accountingMethods.alternateText.${accountingMethod}`)}</Text>
                </OfflineWithFeedback>
            </Accordion>
        </ConnectionLayout>
    );
}

export default withPolicyConnections(BusinessCentralAutoSyncPage);

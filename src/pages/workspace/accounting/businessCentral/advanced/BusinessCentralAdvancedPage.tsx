/**
 * Advanced settings for the Business Central connection: auto sync, export to next open period, reimbursed report
 * and Expensify Card settlement syncing with their bank accounts, posting mode, and entity auto-creation.
 */
import Accordion from '@components/Accordion';
import ConnectionLayout from '@components/ConnectionLayout';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';

import useAccordionAnimation from '@hooks/useAccordionAnimation';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {
    clearBusinessCentralErrorField,
    updateBusinessCentralAutoCreateEntities,
    updateBusinessCentralExportToNextOpenPeriod,
    updateBusinessCentralSyncExpensifyCardSettlements,
    updateBusinessCentralSyncReimbursedReports,
} from '@libs/actions/connections/BusinessCentral';
import {getLatestErrorField} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import {areSettingsInErrorFields, settingsPendingAction} from '@libs/PolicyUtils';

import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ROUTES from '@src/ROUTES';

import {CONST as COMMON_CONST} from 'expensify-common';
import React from 'react';
import {View} from 'react-native';

function BusinessCentralAdvancedPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = policy?.id;
    const businessCentralConfig = policy?.connections?.businessCentral?.config;
    const businessCentralData = policy?.connections?.businessCentral?.data;

    const autoSync = businessCentralConfig?.autoSync?.enabled ?? false;
    const accountingMethod = businessCentralConfig?.export?.accountingMethod ?? COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD.CASH;
    const exportToNextOpenPeriod = businessCentralConfig?.export?.exportToNextOpenPeriod ?? false;
    const postingMode = businessCentralConfig?.export?.postingMode ?? CONST.BUSINESS_CENTRAL_POSTING_MODE.CREATE_AND_POST;
    const autoCreateEntities = businessCentralConfig?.export?.autoCreateEntities ?? false;
    const syncReimbursedReports = businessCentralConfig?.sync?.syncReimbursedReports ?? false;
    const reimbursementBankAccount = businessCentralData?.bankAccounts?.find((bankAccount) => bankAccount.id === businessCentralConfig?.sync?.reimbursementBankAccountID);
    const syncExpensifyCardSettlements = businessCentralConfig?.sync?.syncExpensifyCardSettlements ?? false;
    const settlementsBankAccount = businessCentralData?.bankAccounts?.find((bankAccount) => bankAccount.id === businessCentralConfig?.sync?.settlementsBankAccountID);

    const {isAccordionExpanded: isSyncReimbursedReportsAccordionExpanded, shouldAnimateAccordionSection: shouldAnimateSyncReimbursedReportsAccordionSection} =
        useAccordionAnimation(syncReimbursedReports);
    const {isAccordionExpanded: isSyncExpensifyCardSettlementsAccordionExpanded, shouldAnimateAccordionSection: shouldAnimateSyncExpensifyCardSettlementsAccordionSection} =
        useAccordionAnimation(syncExpensifyCardSettlements);

    return (
        <ConnectionLayout
            displayName="BusinessCentralAdvancedPage"
            headerTitle="workspace.accounting.advanced"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={styles.pb2}
            titleStyle={styles.ph5}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL}
            shouldBeBlocked
        >
            <OfflineWithFeedback
                pendingAction={
                    settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.AUTO_SYNC], businessCentralConfig?.pendingFields) ??
                    settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.ACCOUNTING_METHOD], businessCentralConfig?.pendingFields)
                }
            >
                <MenuItemWithTopDescription
                    title={autoSync ? translate('common.enabled') : translate('common.disabled')}
                    description={translate('workspace.accounting.autoSync')}
                    hintText={autoSync ? translate(`workspace.businessCentral.advanced.accountingMethods.alternateText.${accountingMethod}` as TranslationPaths) : undefined}
                    onPress={() => (policyID ? Navigation.navigate(ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_AUTO_SYNC.getRoute(policyID)) : undefined)}
                    shouldShowRightIcon
                    brickRoadIndicator={
                        areSettingsInErrorFields([CONST.BUSINESS_CENTRAL_CONFIG.AUTO_SYNC, CONST.BUSINESS_CENTRAL_CONFIG.ACCOUNTING_METHOD], businessCentralConfig?.errorFields)
                            ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR
                            : undefined
                    }
                />
            </OfflineWithFeedback>
            <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
            <ToggleSettingOptionRow
                title={translate('workspace.businessCentral.advanced.exportToNextOpenPeriod')}
                subtitle={translate('workspace.businessCentral.advanced.exportToNextOpenPeriodDescription')}
                switchAccessibilityLabel={translate('workspace.businessCentral.advanced.exportToNextOpenPeriod')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive={exportToNextOpenPeriod}
                onToggle={() => policyID && updateBusinessCentralExportToNextOpenPeriod(policyID, !exportToNextOpenPeriod, exportToNextOpenPeriod)}
                pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.EXPORT_TO_NEXT_OPEN_PERIOD], businessCentralConfig?.pendingFields)}
                errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.EXPORT_TO_NEXT_OPEN_PERIOD)}
                onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.EXPORT_TO_NEXT_OPEN_PERIOD)}
            />
            <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
            <ToggleSettingOptionRow
                title={translate('workspace.businessCentral.advanced.syncReimbursedReports')}
                subtitle={translate('workspace.businessCentral.advanced.syncReimbursedReportsDescription')}
                switchAccessibilityLabel={translate('workspace.businessCentral.advanced.syncReimbursedReports')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive={syncReimbursedReports}
                onToggle={() => policyID && updateBusinessCentralSyncReimbursedReports(policyID, !syncReimbursedReports, syncReimbursedReports)}
                pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.SYNC_REIMBURSED_REPORTS], businessCentralConfig?.pendingFields)}
                errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_REIMBURSED_REPORTS)}
                onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_REIMBURSED_REPORTS)}
            />
            <Accordion
                isExpanded={isSyncReimbursedReportsAccordionExpanded}
                isToggleTriggered={shouldAnimateSyncReimbursedReportsAccordionSection}
            >
                <OfflineWithFeedback pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.REIMBURSEMENT_BANK_ACCOUNT_ID], businessCentralConfig?.pendingFields)}>
                    <MenuItemWithTopDescription
                        title={reimbursementBankAccount?.name}
                        description={translate('workspace.businessCentral.advanced.reimbursementBankAccount.label')}
                        onPress={() =>
                            policyID
                                ? Navigation.navigate(
                                      ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_BANK_ACCOUNT_SELECTOR.getRoute(policyID, CONST.BUSINESS_CENTRAL_BANK_ACCOUNT_SETTING.REIMBURSEMENT),
                                  )
                                : undefined
                        }
                        shouldShowRightIcon
                        brickRoadIndicator={
                            areSettingsInErrorFields([CONST.BUSINESS_CENTRAL_CONFIG.REIMBURSEMENT_BANK_ACCOUNT_ID], businessCentralConfig?.errorFields)
                                ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR
                                : undefined
                        }
                    />
                </OfflineWithFeedback>
            </Accordion>
            <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
            <ToggleSettingOptionRow
                title={translate('workspace.businessCentral.advanced.syncExpensifyCardSettlements')}
                switchAccessibilityLabel={translate('workspace.businessCentral.advanced.syncExpensifyCardSettlements')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive={syncExpensifyCardSettlements}
                onToggle={() => policyID && updateBusinessCentralSyncExpensifyCardSettlements(policyID, !syncExpensifyCardSettlements, syncExpensifyCardSettlements)}
                pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.SYNC_EXPENSIFY_CARD_SETTLEMENTS], businessCentralConfig?.pendingFields)}
                errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_EXPENSIFY_CARD_SETTLEMENTS)}
                onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_EXPENSIFY_CARD_SETTLEMENTS)}
            />
            <Accordion
                isExpanded={isSyncExpensifyCardSettlementsAccordionExpanded}
                isToggleTriggered={shouldAnimateSyncExpensifyCardSettlementsAccordionSection}
            >
                <OfflineWithFeedback pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.SETTLEMENTS_BANK_ACCOUNT_ID], businessCentralConfig?.pendingFields)}>
                    <MenuItemWithTopDescription
                        title={settlementsBankAccount?.name}
                        description={translate('workspace.businessCentral.advanced.settlementsBankAccount.label')}
                        onPress={() =>
                            policyID
                                ? Navigation.navigate(
                                      ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_BANK_ACCOUNT_SELECTOR.getRoute(policyID, CONST.BUSINESS_CENTRAL_BANK_ACCOUNT_SETTING.SETTLEMENTS),
                                  )
                                : undefined
                        }
                        shouldShowRightIcon
                        brickRoadIndicator={
                            areSettingsInErrorFields([CONST.BUSINESS_CENTRAL_CONFIG.SETTLEMENTS_BANK_ACCOUNT_ID], businessCentralConfig?.errorFields)
                                ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR
                                : undefined
                        }
                    />
                </OfflineWithFeedback>
            </Accordion>
            <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
            <OfflineWithFeedback pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.POSTING_MODE], businessCentralConfig?.pendingFields)}>
                <MenuItemWithTopDescription
                    title={translate(`workspace.businessCentral.advanced.postingMode.values.${postingMode}`)}
                    description={translate('workspace.businessCentral.advanced.postingMode.label')}
                    onPress={() => (policyID ? Navigation.navigate(ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_ADVANCED_POSTING_MODE.getRoute(policyID)) : undefined)}
                    shouldShowRightIcon
                    brickRoadIndicator={
                        areSettingsInErrorFields([CONST.BUSINESS_CENTRAL_CONFIG.POSTING_MODE], businessCentralConfig?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined
                    }
                />
            </OfflineWithFeedback>
            <ToggleSettingOptionRow
                title={translate('workspace.businessCentral.advanced.autoCreateEntities')}
                switchAccessibilityLabel={translate('workspace.businessCentral.advanced.autoCreateEntities')}
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive={autoCreateEntities}
                onToggle={() => policyID && updateBusinessCentralAutoCreateEntities(policyID, !autoCreateEntities, autoCreateEntities)}
                pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.AUTO_CREATE_ENTITIES], businessCentralConfig?.pendingFields)}
                errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.AUTO_CREATE_ENTITIES)}
                onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.AUTO_CREATE_ENTITIES)}
            />
        </ConnectionLayout>
    );
}

export default withPolicyConnections(BusinessCentralAdvancedPage);

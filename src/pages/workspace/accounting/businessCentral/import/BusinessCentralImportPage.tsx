import ConnectionLayout from '@components/ConnectionLayout';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {
    clearBusinessCentralErrorField,
    updateBusinessCentralDimensionMapping,
    updateBusinessCentralEnableNewCategories,
    updateBusinessCentralSyncTaxRates,
} from '@libs/actions/connections/BusinessCentral';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';

import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

function BusinessCentralImportPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = policy?.id;
    const businessCentralConfig = policy?.connections?.businessCentral?.config;
    const businessCentralData = policy?.connections?.businessCentral?.data;
    const enableNewCategories = businessCentralConfig?.enableNewCategories ?? false;
    const syncTaxRates = businessCentralConfig?.coding?.syncTaxRates ?? false;
    const selectedCompany = businessCentralData?.companies?.find((company) => company.id === businessCentralConfig?.companyID);
    // EU VAT settings only apply to non-US entities
    const shouldShowTaxRates = !!selectedCompany && selectedCompany.country !== CONST.COUNTRY.US && !!businessCentralData?.taxRates?.length;

    return (
        <ConnectionLayout
            displayName="BusinessCentralImportPage"
            headerTitle="workspace.accounting.import"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={styles.pb2}
            titleStyle={styles.ph5}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL}
            shouldBeBlocked
        >
            <View>
                <Text style={[styles.ph5, styles.pb5]}>{translate('workspace.businessCentral.importDescription')}</Text>
            </View>
            <ToggleSettingOptionRow
                title={translate('workspace.accounting.accounts')}
                subtitle={translate('workspace.businessCentral.accountsDescription')}
                switchAccessibilityLabel={translate('workspace.accounting.accounts')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive
                onToggle={() => {}}
                disabled
            />
            <ToggleSettingOptionRow
                title={translate('workspace.businessCentral.enableNewAccountsTitle')}
                subtitle={translate('workspace.businessCentral.enableNewAccountsDescription')}
                switchAccessibilityLabel={translate('workspace.businessCentral.enableNewAccountsTitle')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive={enableNewCategories}
                onToggle={() => policyID && updateBusinessCentralEnableNewCategories(policyID, !enableNewCategories, enableNewCategories)}
                pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.ENABLE_NEW_CATEGORIES], businessCentralConfig?.pendingFields)}
                errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.ENABLE_NEW_CATEGORIES)}
                onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.ENABLE_NEW_CATEGORIES)}
            />
            <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
            <View style={[styles.mv3, styles.mh5]}>
                <Text>{translate('workspace.businessCentral.dimensionsImport')}</Text>
            </View>
            {businessCentralData?.dimensions?.map((dimension) => {
                const mapping = businessCentralConfig?.coding?.dimensionMappings?.[dimension.id];
                const isImported = mapping === CONST.BUSINESS_CENTRAL_MAPPING_VALUE.TAG;
                return (
                    <ToggleSettingOptionRow
                        key={dimension.id}
                        title={dimension.name}
                        subtitle={isImported ? translate('workspace.businessCentral.importedAsTags') : translate('workspace.businessCentral.notImported')}
                        switchAccessibilityLabel={dimension.name}
                        shouldPlaceSubtitleBelowSwitch
                        wrapperStyle={[styles.mv3, styles.mh5]}
                        isActive={isImported}
                        onToggle={() =>
                            policyID &&
                            updateBusinessCentralDimensionMapping(
                                policyID,
                                dimension.id,
                                isImported ? CONST.BUSINESS_CENTRAL_MAPPING_VALUE.NONE : CONST.BUSINESS_CENTRAL_MAPPING_VALUE.TAG,
                                mapping,
                            )
                        }
                        pendingAction={settingsPendingAction([`${CONST.BUSINESS_CENTRAL_CONFIG.DIMENSION_MAPPING_PREFIX}${dimension.id}`], businessCentralConfig?.pendingFields)}
                        errors={getLatestErrorField(businessCentralConfig ?? {}, `${CONST.BUSINESS_CENTRAL_CONFIG.DIMENSION_MAPPING_PREFIX}${dimension.id}`)}
                        onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, `${CONST.BUSINESS_CENTRAL_CONFIG.DIMENSION_MAPPING_PREFIX}${dimension.id}`)}
                    />
                );
            })}
            {shouldShowTaxRates && (
                <>
                    <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
                    <ToggleSettingOptionRow
                        title={translate('workspace.taxes.taxRates')}
                        subtitle={translate('workspace.businessCentral.taxRatesDescription')}
                        switchAccessibilityLabel={translate('workspace.taxes.taxRates')}
                        shouldPlaceSubtitleBelowSwitch
                        wrapperStyle={[styles.mv3, styles.mh5]}
                        isActive={syncTaxRates}
                        onToggle={() => policyID && updateBusinessCentralSyncTaxRates(policyID, !syncTaxRates, syncTaxRates)}
                        pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.SYNC_TAX_RATES], businessCentralConfig?.pendingFields)}
                        errors={getLatestErrorField(businessCentralConfig ?? {}, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_TAX_RATES)}
                        onCloseError={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_TAX_RATES)}
                    />
                </>
            )}
        </ConnectionLayout>
    );
}

export default withPolicyConnections(BusinessCentralImportPage);

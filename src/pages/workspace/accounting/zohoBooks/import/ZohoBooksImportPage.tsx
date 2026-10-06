import ConnectionLayout from '@components/ConnectionLayout';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearZohoBooksErrorField, updateZohoBooksEnableNewCategories, updateZohoBooksSyncTaxRates, updateZohoBooksTagMapping} from '@libs/actions/connections/ZohoBooks';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';

import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

function ZohoBooksImportPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = policy?.id;
    const zohoBooksConfig = policy?.connections?.zohoBooks?.config;
    const zohoBooksData = policy?.connections?.zohoBooks?.data;
    const enableNewCategories = zohoBooksConfig?.enableNewCategories ?? false;
    const hasTags = !!zohoBooksData?.tags?.length;
    const hasTaxRates = !!zohoBooksData?.taxRates?.length;
    const syncTaxRates = zohoBooksConfig?.coding?.syncTaxRates ?? false;

    return (
        <ConnectionLayout
            displayName="ZohoBooksImportPage"
            headerTitle="workspace.accounting.import"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={styles.pb2}
            titleStyle={styles.ph5}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS}
            shouldBeBlocked
        >
            <View>
                <Text style={[styles.ph5, styles.pb5]}>{translate('workspace.zohoBooks.importDescription')}</Text>
            </View>
            <ToggleSettingOptionRow
                title={translate('workspace.accounting.accounts')}
                subtitle={translate('workspace.zohoBooks.accountTypesDescription')}
                switchAccessibilityLabel={translate('workspace.accounting.accounts')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive
                onToggle={() => {}}
                disabled
            />
            <ToggleSettingOptionRow
                title={translate('workspace.zohoBooks.enableNewAccountsTitle')}
                subtitle={translate('workspace.zohoBooks.enableNewAccountsDescription')}
                switchAccessibilityLabel={translate('workspace.zohoBooks.enableNewAccountsTitle')}
                shouldPlaceSubtitleBelowSwitch
                wrapperStyle={[styles.mv3, styles.mh5]}
                isActive={enableNewCategories}
                onToggle={() => policyID && updateZohoBooksEnableNewCategories(policyID, !enableNewCategories, enableNewCategories)}
                pendingAction={settingsPendingAction([CONST.ZOHO_BOOKS_CONFIG.ENABLE_NEW_CATEGORIES], zohoBooksConfig?.pendingFields)}
                errors={getLatestErrorField(zohoBooksConfig ?? {}, CONST.ZOHO_BOOKS_CONFIG.ENABLE_NEW_CATEGORIES)}
                onCloseError={() => policyID && clearZohoBooksErrorField(policyID, CONST.ZOHO_BOOKS_CONFIG.ENABLE_NEW_CATEGORIES)}
            />
            {hasTags && (
                <>
                    <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
                    <View style={[styles.mv3, styles.mh5]}>
                        <Text>{translate('workspace.zohoBooks.reportingTagsImport')}</Text>
                    </View>
                    {zohoBooksData?.tags?.map((tag) => {
                        const mapping = zohoBooksConfig?.coding?.tagMappings?.[tag.id];
                        const isImported = mapping === CONST.ZOHO_BOOKS_MAPPING_VALUE.TAG;
                        return (
                            <ToggleSettingOptionRow
                                key={tag.id}
                                title={tag.name}
                                switchAccessibilityLabel={tag.name}
                                shouldPlaceSubtitleBelowSwitch
                                wrapperStyle={[styles.mv3, styles.mh5]}
                                isActive={isImported}
                                onToggle={() =>
                                    policyID && updateZohoBooksTagMapping(policyID, tag.id, isImported ? CONST.ZOHO_BOOKS_MAPPING_VALUE.NONE : CONST.ZOHO_BOOKS_MAPPING_VALUE.TAG, mapping)
                                }
                                pendingAction={settingsPendingAction([`${CONST.ZOHO_BOOKS_CONFIG.TAG_MAPPING_PREFIX}${tag.id}`], zohoBooksConfig?.pendingFields)}
                                errors={getLatestErrorField(zohoBooksConfig ?? {}, `${CONST.ZOHO_BOOKS_CONFIG.TAG_MAPPING_PREFIX}${tag.id}`)}
                                onCloseError={() => policyID && clearZohoBooksErrorField(policyID, `${CONST.ZOHO_BOOKS_CONFIG.TAG_MAPPING_PREFIX}${tag.id}`)}
                            />
                        );
                    })}
                </>
            )}
            {hasTaxRates && (
                <>
                    <View style={[styles.mv3, styles.mh5, styles.borderTop]} />
                    <ToggleSettingOptionRow
                        title={translate('workspace.taxes.taxRates')}
                        switchAccessibilityLabel={translate('workspace.taxes.taxRates')}
                        shouldPlaceSubtitleBelowSwitch
                        wrapperStyle={[styles.mv3, styles.mh5]}
                        isActive={syncTaxRates}
                        onToggle={() => policyID && updateZohoBooksSyncTaxRates(policyID, !syncTaxRates, syncTaxRates)}
                        pendingAction={settingsPendingAction([CONST.ZOHO_BOOKS_CONFIG.SYNC_TAX_RATES], zohoBooksConfig?.pendingFields)}
                        errors={getLatestErrorField(zohoBooksConfig ?? {}, CONST.ZOHO_BOOKS_CONFIG.SYNC_TAX_RATES)}
                        onCloseError={() => policyID && clearZohoBooksErrorField(policyID, CONST.ZOHO_BOOKS_CONFIG.SYNC_TAX_RATES)}
                    />
                </>
            )}
        </ConnectionLayout>
    );
}

export default withPolicyConnections(ZohoBooksImportPage);

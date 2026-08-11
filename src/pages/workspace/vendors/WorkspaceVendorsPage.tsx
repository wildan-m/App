import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import type {DropdownOption} from '@components/ButtonWithDropdownMenu/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ImportedFromAccountingSoftware from '@components/ImportedFromAccountingSoftware';
import ScreenWrapper from '@components/ScreenWrapper';
import type {WorkspaceVendorTableRowData} from '@components/Tables/WorkspaceVendorsTable';
import WorkspaceVendorsTable from '@components/Tables/WorkspaceVendorsTable';

import useCleanupSelectedOptions from '@hooks/useCleanupSelectedOptions';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import usePermissions from '@hooks/usePermissions';
import usePolicyFeatureWriteAccess from '@hooks/usePolicyFeatureWriteAccess';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useShouldDisplayButtonsInSeparateLine from '@hooks/useShouldDisplayButtonsInSeparateLine';
import useThemeStyles from '@hooks/useThemeStyles';
import useWorkspaceDocumentTitle from '@hooks/useWorkspaceDocumentTitle';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import {getActiveVendorMatchingIntegration, getMatchingVendors, hasVendorFeature} from '@libs/PolicyUtils';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';

import {setPolicyVendorsEnabled} from '@userActions/Policy/Vendor';

import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

import React, {useCallback, useMemo, useState} from 'react';
import {View} from 'react-native';

type WorkspaceVendorsPageProps = WithPolicyConnectionsProps & PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.VENDORS>;

function WorkspaceVendorsPage({policy, route}: WorkspaceVendorsPageProps) {
    const {policyID} = route.params;
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const shouldDisplayButtonsInSeparateLine = useShouldDisplayButtonsInSeparateLine();
    const {isBetaEnabled} = usePermissions();
    const illustrations = useMemoizedLazyIllustrations(['Briefcase']);
    const icons = useMemoizedLazyExpensifyIcons(['Checkmark', 'Close']);
    const {canWrite: canWriteVendors, showReadOnlyModal} = usePolicyFeatureWriteAccess(policy, CONST.POLICY.POLICY_FEATURE.VENDORS);

    useWorkspaceDocumentTitle(policy?.name, 'workspace.common.vendors');

    const isFeatureAvailable = hasVendorFeature(policy, isBetaEnabled(CONST.BETAS.VENDOR_MATCHING));
    const vendors = getMatchingVendors(policy);
    const disabledVendors = policy?.disabledVendors;
    const connectedIntegration = getActiveVendorMatchingIntegration(policy);
    const currentConnectionName = connectedIntegration ? CONST.POLICY.CONNECTIONS.NAME_USER_FRIENDLY[connectedIntegration] : undefined;

    const [selectedVendorKeys, setSelectedVendorKeys] = useState<string[]>([]);

    const clearTableSelection = useCallback(() => {
        setSelectedVendorKeys((prevSelectedVendorKeys) => (prevSelectedVendorKeys.length > 0 ? [] : prevSelectedVendorKeys));
    }, []);

    useCleanupSelectedOptions(clearTableSelection);

    const updateVendorsEnabled = useCallback(
        (vendorIDs: string[], enabled: boolean) => {
            if (!canWriteVendors) {
                showReadOnlyModal();
                return;
            }
            setPolicyVendorsEnabled(policy, vendorIDs, enabled);
        },
        [canWriteVendors, policy, showReadOnlyModal],
    );

    const vendorRows: WorkspaceVendorTableRowData[] = useMemo(
        () =>
            vendors.map((vendor) => ({
                keyForList: vendor.id,
                name: vendor.name,
                enabled: !disabledVendors?.[vendor.id],
                onToggleEnabled: (enabled: boolean) => updateVendorsEnabled([vendor.id], enabled),
            })),
        [vendors, disabledVendors, updateVendorsEnabled],
    );

    const getHeaderButtons = () => {
        if (selectedVendorKeys.length === 0) {
            return null;
        }

        const options: Array<DropdownOption<string>> = [];

        const enabledSelectedVendorIDs = selectedVendorKeys.filter((vendorID) => !disabledVendors?.[vendorID]);
        if (enabledSelectedVendorIDs.length > 0) {
            options.push({
                icon: icons.Close,
                text: translate(enabledSelectedVendorIDs.length === 1 ? 'workspace.vendors.disableVendor' : 'workspace.vendors.disableVendors'),
                value: CONST.POLICY.BULK_ACTION_TYPES.DISABLE,
                onSelected: () => {
                    clearTableSelection();
                    updateVendorsEnabled(enabledSelectedVendorIDs, false);
                },
            });
        }

        const disabledSelectedVendorIDs = selectedVendorKeys.filter((vendorID) => !!disabledVendors?.[vendorID]);
        if (disabledSelectedVendorIDs.length > 0) {
            options.push({
                icon: icons.Checkmark,
                text: translate(disabledSelectedVendorIDs.length === 1 ? 'workspace.vendors.enableVendor' : 'workspace.vendors.enableVendors'),
                value: CONST.POLICY.BULK_ACTION_TYPES.ENABLE,
                onSelected: () => {
                    clearTableSelection();
                    updateVendorsEnabled(disabledSelectedVendorIDs, true);
                },
            });
        }

        return (
            <ButtonWithDropdownMenu
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                onPress={() => null}
                shouldAlwaysShowDropdownMenu
                size={CONST.BUTTON_SIZE.MEDIUM}
                customText={translate('workspace.common.selected', {count: selectedVendorKeys.length})}
                options={options}
                isSplitButton={false}
                style={[shouldDisplayButtonsInSeparateLine && styles.flexGrow1, shouldDisplayButtonsInSeparateLine && styles.mb3]}
                isDisabled={!selectedVendorKeys.length}
                testID="WorkspaceVendorsPage-header-dropdown-menu-button"
            />
        );
    };

    const headerContent = !!currentConnectionName && (
        <View style={[styles.ph5, styles.pb5, styles.pt3, shouldUseNarrowLayout ? styles.workspaceSectionMobile : styles.workspaceSection]}>
            <ImportedFromAccountingSoftware
                policyID={policyID}
                currentConnectionName={currentConnectionName}
                connectedIntegration={connectedIntegration}
                translatedText={translate('workspace.vendors.managedInAccountingSoftware')}
            />
        </View>
    );

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            policyFeature={CONST.POLICY.POLICY_FEATURE.VENDORS}
            shouldBeBlocked={!isFeatureAvailable}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldEnableMaxHeight
                style={[styles.defaultModalContainer]}
                testID="WorkspaceVendorsPage"
                shouldShowOfflineIndicatorInWideScreen
                offlineIndicatorStyle={styles.mtAuto}
            >
                <HeaderWithBackButton
                    icon={illustrations.Briefcase}
                    shouldUseHeadlineHeader
                    shouldShowBackButton={shouldUseNarrowLayout}
                    shouldDisplayHelpButton
                    title={translate('workspace.common.vendors')}
                    onBackButtonPress={() => Navigation.goBack()}
                >
                    {!shouldDisplayButtonsInSeparateLine && getHeaderButtons()}
                </HeaderWithBackButton>
                {shouldDisplayButtonsInSeparateLine && !!getHeaderButtons() && <View style={[styles.pl5, styles.pr5]}>{getHeaderButtons()}</View>}
                {headerContent}
                <WorkspaceVendorsTable
                    vendors={vendorRows}
                    selectionEnabled={canWriteVendors}
                    selectedKeys={selectedVendorKeys}
                    onRowSelectionChange={setSelectedVendorKeys}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceVendorsPage.displayName = 'WorkspaceVendorsPage';

export default withPolicyConnections(WorkspaceVendorsPage);

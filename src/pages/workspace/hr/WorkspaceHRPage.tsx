import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Button from '@components/Button';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import ThreeDotsMenu from '@components/ThreeDotsMenu';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import usePolicy from '@hooks/usePolicy';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import useWorkspaceDocumentTitle from '@hooks/useWorkspaceDocumentTitle';
import {removePolicyConnection} from '@libs/actions/connections';
import {openPolicyHRPage} from '@libs/actions/PolicyConnections';
import Navigation from '@libs/Navigation/Navigation';
import {isGustoConnected} from '@libs/PolicyUtils';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {getGustoConnectionMessage, getGustoSettingRows} from './utils';

type WorkspaceHRPageProps = PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.HR>;

function WorkspaceHRPage({
    route: {
        params: {policyID},
    },
}: WorkspaceHRPageProps) {
    const {translate, datetimeToRelative, getLocalDateFromDatetime} = useLocalize();
    const {isBetaEnabled} = usePermissions();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const policy = usePolicy(policyID);
    const [connectionSyncProgress] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CONNECTION_SYNC_PROGRESS}${policyID}`);
    const [isDisconnectModalVisible, setIsDisconnectModalVisible] = useState(false);
    const icons = useMemoizedLazyExpensifyIcons(['GustoSquare', 'Trashcan']);
    const isConnected = isGustoConnected(policy);

    useWorkspaceDocumentTitle(policy?.name, 'workspace.common.hr');

    const fetchPolicyHRPage = useCallback(() => {
        openPolicyHRPage(policyID);
    }, [policyID]);

    useNetwork({onReconnect: fetchPolicyHRPage});

    useEffect(() => {
        fetchPolicyHRPage();
    }, [fetchPolicyHRPage]);

    const gustoMessage = getGustoConnectionMessage(policy, connectionSyncProgress, getLocalDateFromDatetime, datetimeToRelative, translate);
    const settingRows = getGustoSettingRows(policyID, policy, translate);

    const overflowMenu = useMemo(
        () => [
            {
                icon: icons.Trashcan,
                text: translate('workspace.accounting.disconnect'),
                onSelected: () => setIsDisconnectModalVisible(true),
                shouldCallAfterModalHide: true,
            },
        ],
        [icons.Trashcan, translate],
    );

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.IS_HR_ENABLED}
            shouldBeBlocked={!isBetaEnabled(CONST.BETAS.GUSTO)}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                style={styles.defaultModalContainer}
                testID="WorkspaceHRPage"
                shouldShowOfflineIndicatorInWideScreen
                offlineIndicatorStyle={styles.mtAuto}
            >
                <HeaderWithBackButton
                    title={translate('workspace.common.hr')}
                    shouldShowBackButton={shouldUseNarrowLayout}
                    onBackButtonPress={() => Navigation.goBack()}
                />
                <ScrollView contentContainerStyle={styles.pb5}>
                    <Section
                        title={translate('workspace.hr.title')}
                        subtitle={translate('workspace.hr.subtitle')}
                        isCentralPane
                    >
                        <MenuItemWithTopDescription
                            title={translate('workspace.hr.gusto.title')}
                            description={gustoMessage}
                            icon={icons.GustoSquare}
                            iconType={CONST.ICON_TYPE_ICON}
                            interactive={false}
                            shouldShowRightComponent
                            rightComponent={
                                isConnected ? (
                                    <ThreeDotsMenu
                                        menuItems={overflowMenu}
                                        shouldSelfPosition
                                    />
                                ) : (
                                    <Button
                                        small
                                        text={translate('workspace.hr.gusto.connect')}
                                        onPress={() => {}}
                                        isDisabled
                                    />
                                )
                            }
                            wrapperStyle={styles.mt3}
                        />
                        {isConnected &&
                            settingRows.map((row) => (
                                <OfflineWithFeedback
                                    key={row.route}
                                    pendingAction={row.pendingAction}
                                >
                                    <MenuItem
                                        title={row.title}
                                        description={row.description}
                                        onPress={() => Navigation.navigate(row.route)}
                                        shouldShowRightIcon
                                    />
                                </OfflineWithFeedback>
                            ))}
                    </Section>
                </ScrollView>
                <ConfirmModal
                    isVisible={isDisconnectModalVisible}
                    title={translate('workspace.accounting.disconnectTitle', {connectionName: CONST.POLICY.CONNECTIONS.NAME.GUSTO})}
                    prompt={translate('workspace.hr.gusto.disconnectPrompt')}
                    confirmText={translate('workspace.accounting.disconnect')}
                    cancelText={translate('common.cancel')}
                    danger
                    onConfirm={() => {
                        if (!policy) {
                            return;
                        }
                        removePolicyConnection(policy, CONST.POLICY.CONNECTIONS.NAME.GUSTO);
                        setIsDisconnectModalVisible(false);
                    }}
                    onCancel={() => setIsDisconnectModalVisible(false)}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceHRPage;

import React, {useCallback, useEffect} from 'react';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import usePermissions from '@hooks/usePermissions';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import useWorkspaceDocumentTitle from '@hooks/useWorkspaceDocumentTitle';
import {openPolicyHRPage} from '@libs/actions/PolicyConnections';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

type WorkspaceHRPageProps = PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.HR>;

function WorkspaceHRPage({
    route: {
        params: {policyID},
    },
}: WorkspaceHRPageProps) {
    const {translate} = useLocalize();
    const {isBetaEnabled} = usePermissions();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const icons = useMemoizedLazyExpensifyIcons(['GustoSquare']);

    useWorkspaceDocumentTitle(undefined, 'workspace.common.hr');

    const fetchPolicyHRPage = useCallback(() => {
        openPolicyHRPage(policyID);
    }, [policyID]);

    useNetwork({onReconnect: fetchPolicyHRPage});

    useEffect(() => {
        fetchPolicyHRPage();
    }, [fetchPolicyHRPage]);

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
                            description={translate('workspace.hr.gusto.connectionDescription')}
                            icon={icons.GustoSquare}
                            iconType={CONST.ICON_TYPE_ICON}
                            interactive={false}
                            shouldShowRightComponent
                            rightComponent={
                                <Button
                                    small
                                    text={translate('workspace.hr.gusto.connect')}
                                    onPress={() => {}}
                                />
                            }
                            wrapperStyle={styles.mt3}
                        />
                    </Section>
                </ScrollView>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceHRPage;

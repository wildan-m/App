import Button from '@components/ButtonComposed';
import FixedFooter from '@components/FixedFooter';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import {getConnectedHRProvider} from '@libs/HRUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React, {useState} from 'react';
import {View} from 'react-native';

type WorkspaceHRSyncResultsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.HR_SYNC_RESULTS>;

function WorkspaceHRSyncResultsPage({
    route: {
        params: {policyID, connectionName},
    },
}: WorkspaceHRSyncResultsPageProps) {
    const {translate} = useLocalize();
    const theme = useTheme();
    const styles = useThemeStyles();
    const icons = useMemoizedLazyExpensifyIcons(['DownArrow']);
    const illustrations = useMemoizedLazyIllustrations(['SyncUsers']);
    const [isSkippedSectionExpanded, setIsSkippedSectionExpanded] = useState(false);

    const [providerDisplayName = ''] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        selector: (policy) => getConnectedHRProvider(policy)?.displayName ?? '',
    });
    const [result] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CONNECTION_SYNC_PROGRESS}${policyID}`, {
        selector: (syncProgress) => (syncProgress?.connectionName === connectionName ? syncProgress?.result : undefined),
    });

    const addedCount = result?.addedEmployeesCount ?? 0;
    const removedCount = result?.removedEmployeesCount ?? 0;
    const skippedCount = result?.skippedEmployees?.length ?? 0;

    const renderResultSummary = (label: string, count: number) => (
        <View style={[styles.mb6]}>
            <Text style={[styles.textSupporting, styles.mb1]}>{label}</Text>
            <Text style={[styles.textNormalThemeText, styles.textStrong]}>{translate('workspace.hr.syncResults.employeeCount', {count})}</Text>
        </View>
    );

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.IS_HR_ENABLED}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldEnableMaxHeight
                testID="WorkspaceHRSyncResultsPage"
            >
                <HeaderWithBackButton title={translate('workspace.hr.syncResults.title', providerDisplayName)} />
                <ScrollView
                    contentContainerStyle={[styles.flexGrow1, styles.ph5, styles.pb8]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.alignItemsCenter, styles.mt4, styles.mb4, styles.pRelative]}>
                        <Icon
                            src={illustrations.SyncUsers}
                            width={68}
                            height={68}
                        />
                    </View>
                    <Text style={[styles.textHeadlineH1, styles.mb8]}>{translate('workspace.hr.syncResults.successTitle', providerDisplayName)}</Text>
                    {renderResultSummary(translate('workspace.hr.syncResults.added'), addedCount)}
                    {renderResultSummary(translate('workspace.hr.syncResults.removed'), removedCount)}
                    <PressableWithoutFeedback
                        accessibilityLabel={translate('workspace.hr.syncResults.skipped')}
                        sentryLabel="WorkspaceHRSyncResultsPage-SkippedEmployees"
                        role={CONST.ROLE.BUTTON}
                        onPress={() => setIsSkippedSectionExpanded((isExpanded) => !isExpanded)}
                        style={[styles.flexRow, styles.justifyContentBetween, styles.alignItemsCenter]}
                    >
                        <View>
                            <Text style={[styles.textSupporting, styles.mb1]}>{translate('workspace.hr.syncResults.skipped')}</Text>
                            <Text style={[styles.textNormalThemeText, styles.textStrong]}>{translate('workspace.hr.syncResults.employeeCount', {count: skippedCount})}</Text>
                        </View>
                        <Icon
                            src={icons.DownArrow}
                            fill={theme.icon}
                            additionalStyles={isSkippedSectionExpanded ? {transform: [{rotate: '180deg'}]} : undefined}
                        />
                    </PressableWithoutFeedback>
                    {isSkippedSectionExpanded &&
                        result?.skippedEmployees?.map((employee) => (
                            <View
                                key={employee.id}
                                style={[styles.mt4]}
                            >
                                <Text style={[styles.textNormalThemeText, styles.textStrong]}>{employee.name}</Text>
                                <Text style={[styles.textSupporting]}>{employee.reason}</Text>
                            </View>
                        ))}
                </ScrollView>
                <FixedFooter addBottomSafeAreaPadding>
                    <Button
                        size={CONST.BUTTON_SIZE.LARGE}
                        variant={CONST.BUTTON_VARIANT.SUCCESS}
                        onPress={() => Navigation.goBack()}
                    >
                        <Button.Text>{translate('common.buttonConfirm')}</Button.Text>
                    </Button>
                </FixedFooter>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceHRSyncResultsPage;

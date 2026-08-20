import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';

import useLocalize from '@hooks/useLocalize';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import type {WeeklyAutoReportingDay} from '@libs/PolicyUtils';
import {canEditWorkspaceSettings, getWeeklyAutoReportingDay, goBackFromInvalidPolicy, isGroupPolicy, isPendingDeletePolicy, WEEKLY_AUTO_REPORTING_DAYS} from '@libs/PolicyUtils';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import withPolicy from '@pages/workspace/withPolicy';
import type {WithPolicyOnyxProps} from '@pages/workspace/withPolicy';

import {setWorkspaceAutoReportingMonthlyOffset} from '@userActions/Policy/Policy';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import React, {useCallback, useMemo, useState} from 'react';

type WorkspaceAutoReportingWeeklyDayPageProps = WithPolicyOnyxProps &
    PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.WORKFLOWS_AUTO_REPORTING_WEEKLY_DAY>;

type WorkspaceAutoReportingWeeklyDayPageItem = {
    text: string;
    keyForList: string;
    isSelected: boolean;
};

function WorkspaceAutoReportingWeeklyDayPage({policy, route}: WorkspaceAutoReportingWeeklyDayPageProps) {
    const {translate} = useLocalize();
    const policyID = policy?.id;
    const currentDay = getWeeklyAutoReportingDay(policy);
    const [userSelectedDay, setUserSelectedDay] = useState<WeeklyAutoReportingDay | undefined>();
    const selectedDay = userSelectedDay ?? currentDay;

    const daysOfWeek: WorkspaceAutoReportingWeeklyDayPageItem[] = WEEKLY_AUTO_REPORTING_DAYS.map((day) => ({
        text: translate(`workflowsPage.frequencies.${day}`),
        keyForList: day,
        isSelected: day === selectedDay,
    }));

    const onSelectDayOfWeek = (item: WorkspaceAutoReportingWeeklyDayPageItem) => {
        setUserSelectedDay(item.keyForList as WeeklyAutoReportingDay);
    };

    const saveDayOfWeek = useCallback(() => {
        if (!policyID) {
            return;
        }
        setWorkspaceAutoReportingMonthlyOffset(policyID, selectedDay, policy?.autoReportingOffset);
        Navigation.goBack(ROUTES.WORKSPACE_WORKFLOWS_AUTOREPORTING_FREQUENCY.getRoute(policyID));
    }, [policyID, policy?.autoReportingOffset, selectedDay]);

    const confirmButtonOptions = useMemo(
        () => ({
            showButton: true,
            text: translate('common.save'),
            onConfirm: saveDayOfWeek,
            isDisabled: selectedDay === currentDay,
        }),
        [saveDayOfWeek, translate, selectedDay, currentDay],
    );

    return (
        <AccessOrNotFoundWrapper
            policyID={route.params.policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_WORKFLOWS_ENABLED}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                testID="WorkspaceAutoReportingWeeklyDayPage"
            >
                <FullPageNotFoundView
                    onBackButtonPress={goBackFromInvalidPolicy}
                    onLinkPress={goBackFromInvalidPolicy}
                    shouldShow={isEmptyObject(policy) || !canEditWorkspaceSettings(policy) || isPendingDeletePolicy(policy) || !isGroupPolicy(policy)}
                    subtitleKey={isEmptyObject(policy) ? undefined : 'workspace.common.notAuthorized'}
                    addBottomSafeAreaPadding
                >
                    <HeaderWithBackButton
                        title={translate('workflowsPage.submitOn')}
                        onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACE_WORKFLOWS_AUTOREPORTING_FREQUENCY.getRoute(policy?.id))}
                    />

                    <SelectionList
                        data={daysOfWeek}
                        ListItem={SingleSelectListItem}
                        onSelectRow={onSelectDayOfWeek}
                        confirmButtonOptions={confirmButtonOptions}
                        initiallyFocusedItemKey={currentDay}
                        shouldSingleExecuteRowSelect
                        addBottomSafeAreaPadding
                        showScrollIndicator
                    />
                </FullPageNotFoundView>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default withPolicy(WorkspaceAutoReportingWeeklyDayPage);

import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDocumentTitle from '@hooks/useDocumentTitle';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';

import type {TabNavigatorParamList} from '@libs/Navigation/types';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

import React from 'react';

import {getAccessibleDashboards} from './dashboardSpecs';
import InsightsDashboard from './InsightsDashboard';

type InsightsPageProps = BottomTabScreenProps<TabNavigatorParamList, typeof SCREENS.INSIGHTS>;

function InsightsPage({route}: InsightsPageProps) {
    const {translate} = useLocalize();
    const {isBetaEnabled} = usePermissions();
    const {login} = useCurrentUserPersonalDetails();
    const [policies, policiesMetadata] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    useDocumentTitle(translate('common.insights'));

    // A direct link only opens a dashboard the user can access in at least one of their workspaces
    const dashboardID = getAccessibleDashboards(policies, [], login, isBetaEnabled).find((id) => id === route.params?.dashboardID);

    // Which dashboards are accessible depends on the user's workspaces, so wait for them before deciding a refreshed link is not found
    if (!dashboardID && isLoadingOnyxValue(policiesMetadata)) {
        return <FullScreenLoadingIndicator />;
    }

    if (!isBetaEnabled(CONST.BETAS.INSIGHTS_PAGE) || !dashboardID) {
        return <NotFoundPage />;
    }

    return <InsightsDashboard dashboardID={dashboardID} />;
}

export default InsightsPage;

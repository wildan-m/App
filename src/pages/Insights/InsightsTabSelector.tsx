import TabSelectorBase from '@components/TabSelector/TabSelectorBase';
import TabSelectorContextProvider from '@components/TabSelector/TabSelectorContext';
import type {TabSelectorBaseItem} from '@components/TabSelector/types';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import ROUTES from '@src/ROUTES';
import type {InsightsDashboardID} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';

import INSIGHTS_DASHBOARD_SPECS from './dashboardSpecs';

type InsightsTabSelectorProps = {
    /** Dashboard the route points at */
    activeDashboardID: InsightsDashboardID;

    /** Dashboards the user can switch between, in the order the tabs are shown */
    dashboardIDs: InsightsDashboardID[];
};

function InsightsTabSelector({activeDashboardID, dashboardIDs}: InsightsTabSelectorProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const tabs: Array<TabSelectorBaseItem<InsightsDashboardID>> = dashboardIDs.map((dashboardID) => ({
        key: dashboardID,
        title: translate(INSIGHTS_DASHBOARD_SPECS[dashboardID].labelKey),
    }));

    // The route is the source of truth for the selected dashboard, so pressing a tab only navigates to its route
    const navigateToDashboard = (dashboardID: InsightsDashboardID) => {
        if (dashboardID === activeDashboardID) {
            return;
        }
        Navigation.navigate(ROUTES.INSIGHTS.getRoute(dashboardID));
    };

    return (
        <View style={[styles.ph5, styles.pb3]}>
            <TabSelectorContextProvider activeTabKey={activeDashboardID}>
                <TabSelectorBase
                    tabs={tabs}
                    activeTabKey={activeDashboardID}
                    onTabPress={navigateToDashboard}
                />
            </TabSelectorContextProvider>
        </View>
    );
}

export default InsightsTabSelector;

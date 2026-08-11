import {act, render} from '@testing-library/react-native';

import useResponsiveLayout from '@hooks/useResponsiveLayout';

import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import Navigation from '@libs/Navigation/Navigation';
import navigationRef from '@libs/Navigation/navigationRef';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import React from 'react';

import TestNavigationContainer from '../utils/TestNavigationContainer';

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@libs/getIsNarrowLayout', () => jest.fn());

jest.mock('@pages/inbox/sidebar/NavigationTabBarAvatar');

const mockedGetIsNarrowLayout = jest.mocked(getIsNarrowLayout);
const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

const POLICY_ID = 'ABC123';
const REPORT_ID = '5555';
const REPORTS_TAB_INDEX = 1;

/** A report opened in the Reports tab, which is where the commuter exclusion system message is shown. */
function getReportInitialState() {
    return {
        index: 0,
        routes: [
            {
                name: NAVIGATORS.TAB_NAVIGATOR,
                state: {
                    index: REPORTS_TAB_INDEX,
                    routes: [
                        {name: SCREENS.HOME},
                        {
                            name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR,
                            state: {
                                index: 1,
                                routes: [{name: SCREENS.INBOX}, {name: SCREENS.REPORT, params: {reportID: REPORT_ID}}],
                            },
                        },
                        {name: NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR},
                        {name: NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR},
                        {name: NAVIGATORS.WORKSPACE_NAVIGATOR},
                    ],
                },
            },
        ],
    };
}

function getActiveTabName() {
    const rootState = navigationRef.current?.getRootState();
    const tabRoute = rootState?.routes.findLast((route) => route.name === NAVIGATORS.TAB_NAVIGATOR);
    return tabRoute?.state?.routes?.at(tabRoute?.state?.index ?? 0)?.name;
}

describe('Opening the workspace distance rates settings from a report', () => {
    beforeEach(() => {
        mockedGetIsNarrowLayout.mockReturnValue(true);
        mockedUseResponsiveLayout.mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: true});
    });

    it('keeps the report under the overlay instead of switching the tab underneath', () => {
        // Given a report opened in the Reports tab
        render(<TestNavigationContainer initialState={getReportInitialState()} />);

        // When tapping the workspace distance settings link in the commuter exclusion system message
        act(() => {
            Navigation.navigate(ROUTES.WORKSPACE_DISTANCE_RATES_SETTINGS.getRoute(POLICY_ID));
        });

        // Then the settings page opens in the RHP over the report the user came from
        const rootState = navigationRef.current?.getRootState();
        expect(rootState?.routes.at(-1)?.name).toBe(NAVIGATORS.RIGHT_MODAL_NAVIGATOR);

        // And the tab underneath the overlay is still the Reports tab, so dismissing the RHP goes back to the report
        expect(getActiveTabName()).toBe(NAVIGATORS.REPORTS_SPLIT_NAVIGATOR);
    });

    it('does not stack duplicate tab navigators when the link is opened twice', () => {
        // Given a report opened in the Reports tab
        render(<TestNavigationContainer initialState={getReportInitialState()} />);

        // When following the reported steps: open the settings, go back, reopen the expense and open the settings again
        act(() => {
            Navigation.navigate(ROUTES.WORKSPACE_DISTANCE_RATES_SETTINGS.getRoute(POLICY_ID));
        });
        act(() => {
            Navigation.goBack();
        });
        act(() => {
            Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID));
        });
        act(() => {
            Navigation.navigate(ROUTES.WORKSPACE_DISTANCE_RATES_SETTINGS.getRoute(POLICY_ID));
        });

        // Then only one tab navigator is left in the root stack, with the Reports tab still active under the overlay
        const rootState = navigationRef.current?.getRootState();
        const tabNavigators = rootState?.routes.filter((route) => route.name === NAVIGATORS.TAB_NAVIGATOR);
        expect(tabNavigators?.length).toBe(1);
        expect(rootState?.routes.at(-1)?.name).toBe(NAVIGATORS.RIGHT_MODAL_NAVIGATOR);
        expect(getActiveTabName()).toBe(NAVIGATORS.REPORTS_SPLIT_NAVIGATOR);
    });

    it('still opens the add payment card page over the Settings tab', () => {
        // Given a report opened in the Reports tab
        render(<TestNavigationContainer initialState={getReportInitialState()} />);

        // When opening the add payment card page from the report
        act(() => {
            Navigation.navigate(ROUTES.SETTINGS_SUBSCRIPTION_ADD_PAYMENT_CARD);
        });

        // Then the Settings tab is still put under the overlay, because that page always belongs to the Subscription tab
        expect(getActiveTabName()).toBe(NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR);
    });
});

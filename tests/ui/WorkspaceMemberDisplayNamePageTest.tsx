import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {CurrentUserPersonalDetailsProvider} from '@components/CurrentUserPersonalDetailsProvider';
import HTMLEngineProvider from '@components/HTMLEngineProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import PersonalDetailsByLoginProvider from '@components/PersonalDetailsByLoginProvider';

import * as useResponsiveLayoutModule from '@hooks/useResponsiveLayout';
import type ResponsiveLayoutResult from '@hooks/useResponsiveLayout/types';

import Navigation from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import {generateAccountID} from '@libs/UserUtils';

import type {SettingsNavigatorParamList} from '@navigation/types';

import WorkspaceMemberDisplayNamePage from '@pages/workspace/members/WorkspaceMemberDisplayNamePage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {PersonalDetails} from '@src/types/onyx';

import {PortalProvider} from '@gorhom/portal';
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../utils/getOnyxValue';
import * as LHNTestUtils from '../utils/LHNTestUtils';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));

TestHelper.setupGlobalFetchMock();

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

const renderPage = (initialParams: SettingsNavigatorParamList[typeof SCREENS.WORKSPACE.DYNAMIC_MEMBER_DISPLAY_NAME]) =>
    render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, HTMLEngineProvider, PersonalDetailsByLoginProvider, CurrentUserPersonalDetailsProvider]}>
            <PortalProvider>
                <NavigationContainer>
                    <Stack.Navigator initialRouteName={SCREENS.WORKSPACE.DYNAMIC_MEMBER_DISPLAY_NAME}>
                        <Stack.Screen
                            name={SCREENS.WORKSPACE.DYNAMIC_MEMBER_DISPLAY_NAME}
                            component={WorkspaceMemberDisplayNamePage}
                            initialParams={initialParams}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </PortalProvider>
        </ComposeProviders>,
    );

describe('WorkspaceMemberDisplayNamePage', () => {
    const selfAccountID = 1206;
    const selfEmail = 'self@example.com';
    const invitedAccountID = 5555;
    const invitedEmail = 'newmember@example.com';
    const outsiderEmail = 'outsider@example.com';

    const policy = {
        ...LHNTestUtils.getFakePolicy(),
        role: CONST.POLICY.ROLE.ADMIN,
        owner: selfEmail,
        ownerAccountID: selfAccountID,
        type: CONST.POLICY.TYPE.CORPORATE,
        employeeList: {
            [selfEmail]: {email: selfEmail, role: CONST.POLICY.ROLE.ADMIN},
            [invitedEmail]: {email: invitedEmail, role: CONST.POLICY.ROLE.USER},
        },
    };

    // An invited user without an account has no name yet.
    const invitedPersonalDetails: PersonalDetails = {accountID: invitedAccountID, login: invitedEmail, displayName: invitedEmail};

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await TestHelper.signInWithTestUser(selfAccountID, selfEmail, undefined, 'Self');
        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PREFERRED_LOCALE, CONST.LOCALES.EN);
            await Onyx.set(ONYXKEYS.PERSONAL_DETAILS_LIST, {
                [selfAccountID]: TestHelper.buildPersonalDetails(selfEmail, selfAccountID, 'Self'),
                [invitedAccountID]: invitedPersonalDetails,
            });
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy);
        });
        const responsiveLayout: ResponsiveLayoutResult = {
            shouldUseNarrowLayout: false,
            isSmallScreenWidth: false,
            isInNarrowPaneModal: false,
            isExtraSmallScreenHeight: false,
            isMediumScreenWidth: false,
            isLargeScreenWidth: true,
            isExtraLargeScreenWidth: false,
            isExtraSmallScreenWidth: false,
            isSmallScreen: false,
            onboardingIsMediumOrLargerScreenWidth: true,
            isInLandscapeMode: false,
        };
        jest.spyOn(useResponsiveLayoutModule, 'default').mockReturnValue(responsiveLayout);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await act(async () => {
            await Onyx.clear();
        });
    });

    it('shows the form and updates the real account when the route keeps the optimistic invite ID', async () => {
        // Given a route that still holds the ID generated from the login while the invite was pending, which has no personal details entry
        jest.spyOn(Navigation, 'goBack').mockImplementation(() => {});
        const staleOptimisticAccountID = generateAccountID(invitedEmail);
        const {unmount} = renderPage({policyID: policy.id, accountID: String(staleOptimisticAccountID)});
        await waitForBatchedUpdatesWithAct();

        // Then the editor opens, because the member is resolved by login like on Member details
        await waitFor(() => expect(screen.getByLabelText('First name')).toBeOnTheScreen());

        // When the admin saves a name
        fireEvent.changeText(screen.getByLabelText('First name'), 'Jane');
        fireEvent.changeText(screen.getByLabelText('Last name'), 'Doe');
        fireEvent.press(screen.getByText('Save'));
        await waitForBatchedUpdatesWithAct();

        // Then the name is written to the member's real personal details entry, not to the stale ID
        const personalDetailsList = await getOnyxValue(ONYXKEYS.PERSONAL_DETAILS_LIST);
        expect(personalDetailsList?.[invitedAccountID]?.firstName).toBe('Jane');
        expect(personalDetailsList?.[invitedAccountID]?.lastName).toBe('Doe');
        expect(personalDetailsList?.[staleOptimisticAccountID]).toBeUndefined();
        unmount();
    });

    it('stays blocked for an account that is not a workspace member', async () => {
        // Given a route for an account whose login is not in the workspace
        // When the page opens
        const {unmount} = renderPage({policyID: policy.id, accountID: String(generateAccountID(outsiderEmail))});
        await waitForBatchedUpdatesWithAct();

        // Then the editor is not shown, so the login fallback does not open the page for non-members
        expect(screen.queryByLabelText('First name')).not.toBeOnTheScreen();
        unmount();
    });
});

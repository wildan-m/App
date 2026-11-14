import {act, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import {CurrentReportIDContextProvider} from '@hooks/useCurrentReportID';

import Navigation, {navigationRef} from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import PersonalAddressPage from '@pages/settings/Profile/PersonalDetails/PersonalAddressPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import {PortalProvider} from '@gorhom/portal';
import {NavigationContainer} from '@react-navigation/native';
import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@rnmapbox/maps', () => {
    return {
        default: jest.fn(),
        MarkerView: jest.fn(),
        setAccessToken: jest.fn(),
    };
});

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

const renderPage = (initialRouteName: typeof SCREENS.SETTINGS.PROFILE.ADDRESS, initialParams?: Record<string, string>) => {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, CurrentReportIDContextProvider]}>
            <PortalProvider>
                <NavigationContainer ref={navigationRef}>
                    <Stack.Navigator initialRouteName={initialRouteName}>
                        <Stack.Screen
                            name={SCREENS.SETTINGS.PROFILE.ADDRESS}
                            component={PersonalAddressPage}
                            initialParams={initialParams as SettingsNavigatorParamList[typeof SCREENS.SETTINGS.PROFILE.ADDRESS]}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </PortalProvider>
        </ComposeProviders>,
    );
};

describe('AddressPageTest', () => {
    beforeAll(async () => {
        Onyx.init({
            keys: ONYXKEYS,
        });

        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PREFERRED_LOCALE, CONST.LOCALES.EN);
        });
        await waitForBatchedUpdatesWithAct();
    });
    it('should not reset state', async () => {
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.PRIVATE_PERSONAL_DETAILS}`, {
                addresses: [
                    {
                        state: 'Test',
                        country: 'VN',
                        street: 'Test',
                    },
                ],
            });
            await Onyx.merge(`${ONYXKEYS.IS_LOADING_APP}`, false);
        });

        await waitForBatchedUpdatesWithAct();

        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS);

        await waitForBatchedUpdatesWithAct();
        const stateInput = screen.getByLabelText('State / Province');
        expect(stateInput.props.value).toEqual('Test');
        Navigation.setParams({
            country: 'VN',
        });
        await waitForBatchedUpdatesWithAct();
        const stateInputAfterParams = screen.getByLabelText('State / Province');
        expect(stateInputAfterParams.props.value).toEqual('Test');
    });

    it('should prefill address line 2 from explicit street2', async () => {
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.PRIVATE_PERSONAL_DETAILS}`, {
                addresses: [
                    {
                        country: 'US',
                        street: '123 Main St\nLegacy Suite',
                        street2: 'Suite 500',
                    },
                ],
            });
            await Onyx.merge(`${ONYXKEYS.IS_LOADING_APP}`, false);
        });

        await waitForBatchedUpdatesWithAct();

        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS);

        await waitForBatchedUpdatesWithAct();
        expect(screen.getByDisplayValue('Suite 500')).toBeDefined();
    });

    it('should prefill address line 2 from legacy newline when street2 is missing', async () => {
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.PRIVATE_PERSONAL_DETAILS}`, {
                addresses: [
                    {
                        country: 'US',
                        street: '123 Main St\nLegacy Suite',
                    },
                ],
            });
            await Onyx.merge(`${ONYXKEYS.IS_LOADING_APP}`, false);
        });

        await waitForBatchedUpdatesWithAct();

        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS);

        await waitForBatchedUpdatesWithAct();
        expect(screen.getByDisplayValue('Legacy Suite')).toBeDefined();
    });

    it('should default the country to the IP-derived country code', async () => {
        // Given no saved address and a valid country code detected from the IP address
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.set(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, {addresses: []});
            await Onyx.set(ONYXKEYS.COUNTRY, 'CA');
        });
        await waitForBatchedUpdatesWithAct();

        // When the page mounts
        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS);
        await waitForBatchedUpdatesWithAct();

        // Then the detected country is preselected
        expect(screen.getByText('Canada')).toBeOnTheScreen();
    });

    it('should leave the country empty when the IP-derived value is not a country code', async () => {
        // Given no saved address and a detected value that is not a known country, so it must not reach the country picker as a country
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.set(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, {addresses: []});
            await Onyx.set(ONYXKEYS.COUNTRY, 'Not a country');
        });
        await waitForBatchedUpdatesWithAct();

        // When the page mounts
        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS);
        await waitForBatchedUpdatesWithAct();

        // Then no country is preselected and the raw value is not shown
        expect(screen.getByLabelText('Address line 1')).toBeOnTheScreen();
        expect(screen.queryByText(/Not a country/)).not.toBeOnTheScreen();
        expect(screen.queryByText('United States')).not.toBeOnTheScreen();
    });

    it('should show the state from the URL instead of the saved state', async () => {
        // Given a saved US address with a state
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.set(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, {addresses: [{country: 'US', state: 'CA', city: 'Los Angeles', street: '123 Main St'}]});
            await Onyx.merge(`${ONYXKEYS.IS_LOADING_APP}`, false);
        });
        await waitForBatchedUpdatesWithAct();

        // When the page is opened with a state URL param
        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS, {state: 'MO'});
        await waitForBatchedUpdatesWithAct();

        // Then the URL state is shown instead of the saved one
        expect(screen.getByText('Missouri')).toBeOnTheScreen();
        expect(screen.queryByText('California')).not.toBeOnTheScreen();
    });

    it('should keep the state from the URL when the saved address loads after mount', async () => {
        // Given the saved address is not loaded yet
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.set(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, null);
            await Onyx.set(ONYXKEYS.COUNTRY, 'US');
            await Onyx.merge(`${ONYXKEYS.IS_LOADING_APP}`, false);
        });
        await waitForBatchedUpdatesWithAct();

        // When the page is opened with a state URL param and the saved address arrives afterwards
        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS, {state: 'MO'});
        await waitForBatchedUpdatesWithAct();
        await act(async () => {
            await Onyx.set(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, {addresses: [{country: 'US', state: 'CA', city: 'Los Angeles', street: '123 Main St'}]});
        });
        await waitForBatchedUpdatesWithAct();

        // Then the URL state is still shown
        expect(screen.getByText('Missouri')).toBeOnTheScreen();
        expect(screen.queryByText('California')).not.toBeOnTheScreen();
    });

    it('should show the saved state when there is no state URL param', async () => {
        // Given a saved US address with a state
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.set(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, {addresses: [{country: 'US', state: 'CA', city: 'Los Angeles', street: '123 Main St'}]});
            await Onyx.merge(`${ONYXKEYS.IS_LOADING_APP}`, false);
        });
        await waitForBatchedUpdatesWithAct();

        // When the page is opened without a state URL param
        renderPage(SCREENS.SETTINGS.PROFILE.ADDRESS);
        await waitForBatchedUpdatesWithAct();

        // Then the saved state is shown
        expect(screen.getByText('California')).toBeOnTheScreen();
    });
});

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import {CurrentReportIDContextProvider} from '@hooks/useCurrentReportID';

import {navigationRef} from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import PersonalAddressPage from '@pages/settings/Profile/PersonalDetails/PersonalAddressPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as ReactNavigation from '@react-navigation/native';

import {PortalProvider} from '@gorhom/portal';
import {CommonActions, NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const mockShowConfirmModal = jest.fn();

jest.mock('@hooks/useConfirmModal', () => ({
    __esModule: true,
    default: () => ({showConfirmModal: mockShowConfirmModal, closeModal: jest.fn()}),
}));

// The shared navigation mock stubs usePreventRemove, which is what blocks the navigation here, so these tests need the real one.
jest.mock('@react-navigation/native', () => jest.requireActual<typeof ReactNavigation>('@react-navigation/native'));

jest.mock('@rnmapbox/maps', () => ({
    default: jest.fn(),
    MarkerView: jest.fn(),
    setAccessToken: jest.fn(),
}));

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

function PreviousPage() {
    return <View testID="previous-page" />;
}

const ADDRESS_LINE_2 = 'Address line 2';

async function renderAddressPageOverPreviousPage() {
    render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, CurrentReportIDContextProvider]}>
            <PortalProvider>
                <NavigationContainer ref={navigationRef}>
                    <Stack.Navigator initialRouteName={SCREENS.SETTINGS.PROFILE.DISPLAY_NAME}>
                        <Stack.Screen
                            name={SCREENS.SETTINGS.PROFILE.DISPLAY_NAME}
                            component={PreviousPage}
                        />
                        <Stack.Screen
                            name={SCREENS.SETTINGS.PROFILE.ADDRESS}
                            component={PersonalAddressPage}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </PortalProvider>
        </ComposeProviders>,
    );
    await waitForBatchedUpdatesWithAct();
    act(() => navigationRef.current?.dispatch(CommonActions.navigate(SCREENS.SETTINGS.PROFILE.ADDRESS)));
    await waitForBatchedUpdatesWithAct();
}

async function leavePage() {
    act(() => navigationRef.current?.goBack());
    await waitForBatchedUpdatesWithAct();
}

function getFocusedRouteName() {
    return navigationRef.current?.getCurrentRoute()?.name;
}

describe('AddressPage discard changes', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PREFERRED_LOCALE, CONST.LOCALES.EN);
        });
        await waitForBatchedUpdatesWithAct();
        await TestHelper.signInWithTestUser();
        await act(async () => {
            await Onyx.merge(ONYXKEYS.PRIVATE_PERSONAL_DETAILS, {addresses: [{state: 'Test', country: 'VN', street: 'Test', city: 'Hanoi', zip: '100000'}]});
            await Onyx.merge(ONYXKEYS.IS_LOADING_APP, false);
        });
        await waitForBatchedUpdatesWithAct();
    });

    beforeEach(() => {
        mockShowConfirmModal.mockReset();
    });

    it('leaves without a prompt when nothing changed', async () => {
        // Given the address page opened with the saved address and no edits
        await renderAddressPageOverPreviousPage();
        expect(getFocusedRouteName()).toBe(SCREENS.SETTINGS.PROFILE.ADDRESS);

        // When the user leaves it
        await leavePage();

        // Then nothing would be lost, so the page closes without asking
        expect(mockShowConfirmModal).not.toHaveBeenCalled();
        expect(getFocusedRouteName()).toBe(SCREENS.SETTINGS.PROFILE.DISPLAY_NAME);
    });

    it('stays on the page with the typed value when the prompt is cancelled', async () => {
        // Given an address page with an unsaved edit, and a user who will cancel the prompt
        mockShowConfirmModal.mockResolvedValue({action: ModalActions.CLOSE});
        await renderAddressPageOverPreviousPage();
        fireEvent.changeText(screen.getByLabelText(ADDRESS_LINE_2), 'Unit 5');
        await waitForBatchedUpdatesWithAct();

        // When the user tries to leave it
        await leavePage();

        // Then the prompt appears, and cancelling keeps the form open with the typed value
        expect(mockShowConfirmModal).toHaveBeenCalledTimes(1);
        expect(getFocusedRouteName()).toBe(SCREENS.SETTINGS.PROFILE.ADDRESS);
        expect(screen.getByLabelText(ADDRESS_LINE_2).props.value).toBe('Unit 5');
    });

    it('leaves the page when the prompt is confirmed', async () => {
        // Given an address page with an unsaved edit, and a user who will confirm the prompt
        mockShowConfirmModal.mockResolvedValue({action: ModalActions.CONFIRM});
        await renderAddressPageOverPreviousPage();
        fireEvent.changeText(screen.getByLabelText(ADDRESS_LINE_2), 'Unit 5');
        await waitForBatchedUpdatesWithAct();

        // When the user tries to leave it
        await leavePage();

        // Then discarding replays the blocked navigation
        expect(mockShowConfirmModal).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(getFocusedRouteName()).toBe(SCREENS.SETTINGS.PROFILE.DISPLAY_NAME));
    });

    it('does not prompt when the edit is saved', async () => {
        // Given an address page with an unsaved edit
        await renderAddressPageOverPreviousPage();
        fireEvent.changeText(screen.getByLabelText(ADDRESS_LINE_2), 'Unit 5');
        await waitForBatchedUpdatesWithAct();

        // When the user saves it, which navigates back
        fireEvent.press(screen.getByText('Save'));
        await waitForBatchedUpdatesWithAct();

        // Then the page closes without asking, because nothing was lost
        await waitFor(() => expect(getFocusedRouteName()).toBe(SCREENS.SETTINGS.PROFILE.DISPLAY_NAME));
        expect(mockShowConfirmModal).not.toHaveBeenCalled();
    });
});

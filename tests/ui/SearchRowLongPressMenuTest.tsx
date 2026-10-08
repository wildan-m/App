import {act, fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import {ModalProvider} from '@components/Modal/Global/ModalContext';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import useRowLongPressMenu from '@components/Search/primitives/useRowLongPressMenu';
import type {SearchListItem, TransactionListItemType} from '@components/Search/SearchList/ListItem/types';
import Text from '@components/Text';

import navigationRef from '@libs/Navigation/navigationRef';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as ReactNative from 'react-native';

import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';
import getOnyxValue from 'tests/utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from 'tests/utils/waitForBatchedUpdatesWithAct';

import {translateLocal} from '../utils/TestHelper';

const SEARCH_ROUTE_KEY = 'Search-route-key';
const mockToggle = jest.fn();

jest.mock('@components/Search/SearchContext', () => ({
    useSearchRowSelectionActions: () => ({toggle: mockToggle}),
}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useRoute: () => ({key: 'Search-route-key', name: 'Search'}),
}));

// The real modal hides through an animation that never finishes under Jest, so report the hide as soon as it is hidden
jest.mock('@components/Modal', () => {
    const ReactLocal = jest.requireActual<typeof React>('react');
    const {Pressable: MockPressable, View: MockView} = jest.requireActual<typeof ReactNative>('react-native');
    function MockModal({isVisible, onClose, onModalHide, children}: {isVisible: boolean; onClose?: () => void; onModalHide?: () => void; children?: React.ReactNode}): React.ReactNode {
        const wasVisibleRef = ReactLocal.useRef(isVisible);
        ReactLocal.useEffect(() => {
            if (wasVisibleRef.current && !isVisible) {
                onModalHide?.();
            }
            wasVisibleRef.current = isVisible;
        }, [isVisible, onModalHide]);
        if (!isVisible) {
            return null;
        }
        return (
            <MockView>
                <MockPressable
                    testID="modal-backdrop"
                    onPress={onClose}
                />
                {children}
            </MockView>
        );
    }
    return MockModal;
});

jest.mock('@libs/Navigation/navigationRef', () => ({
    current: {getCurrentRoute: jest.fn()},
    getRootState: jest.fn(),
    getState: jest.fn(),
    isReady: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
}));

const mockGetCurrentRoute = jest.mocked(navigationRef.current?.getCurrentRoute) as unknown as jest.Mock;

const ROW = {keyForList: 'row-1'} as SearchListItem;
const ROW_TRANSACTIONS = [{keyForList: 'transaction-1'}] as TransactionListItemType[];

type LongPressHarnessProps = {
    item?: SearchListItem;
    isSmallScreenWidth?: boolean;
    isMobileSelectionModeEnabled?: boolean;
    shouldPreventLongPressRow?: boolean;
};

function LongPressHarness({item = ROW, isSmallScreenWidth = true, isMobileSelectionModeEnabled = false, shouldPreventLongPressRow = false}: LongPressHarnessProps) {
    const {onLongPressRow} = useRowLongPressMenu({shouldPreventLongPressRow, isSmallScreenWidth, isMobileSelectionModeEnabled});
    return (
        <View
            testID="row"
            onTouchEnd={() => onLongPressRow(item, ROW_TRANSACTIONS)}
        >
            <Text>{item.keyForList}</Text>
        </View>
    );
}

function renderWithProviders({isListMounted = true, ...props}: LongPressHarnessProps & {isListMounted?: boolean} = {}) {
    return (
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <ModalProvider>{isListMounted && <LongPressHarness {...props} />}</ModalProvider>
        </ComposeProviders>
    );
}

const longPressRow = async () => {
    fireEvent(screen.getByTestId('row'), 'touchEnd');
    await waitForBatchedUpdatesWithAct();
};

const getSelectMenuItem = () => screen.queryByLabelText(translateLocal('common.select'));

describe('useRowLongPressMenu', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(() => {
        mockToggle.mockClear();
        mockGetCurrentRoute.mockReturnValue({key: SEARCH_ROUTE_KEY, name: 'Search'});
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
    });

    it('opens the "Select" menu from the global modal stack and selects the pressed row once it closes', async () => {
        // Given a Search list on a narrow layout, which no longer renders a long-press menu of its own
        render(renderWithProviders());
        await waitForBatchedUpdatesWithAct();
        expect(getSelectMenuItem()).toBeNull();

        // When the user long-presses a row
        await longPressRow();

        // Then the "Select" menu is shown, and nothing is selected yet
        expect(getSelectMenuItem()).toBeOnTheScreen();
        expect(mockToggle).not.toHaveBeenCalled();

        // When the user confirms with "Select"
        const selectMenuItem = getSelectMenuItem();
        if (!selectMenuItem) {
            throw new Error('Expected the "Select" menu item to be rendered');
        }
        // The menu row ignores presses that carry no event, so hand it one like a real tap would
        fireEvent.press(selectMenuItem, {nativeEvent: {}});
        await waitForBatchedUpdatesWithAct();

        // Then the menu closes, selection mode is turned on, and the pressed row is toggled with its transactions
        expect(getSelectMenuItem()).toBeNull();
        expect(await getOnyxValue(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE)).toBe(true);
        expect(mockToggle).toHaveBeenCalledTimes(1);
        expect(mockToggle).toHaveBeenCalledWith(ROW, ROW_TRANSACTIONS);
    });

    it('does not select the row when the menu is dismissed', async () => {
        // Given the menu was opened from a row
        render(renderWithProviders());
        await waitForBatchedUpdatesWithAct();
        await longPressRow();
        expect(getSelectMenuItem()).toBeOnTheScreen();

        // When the user dismisses it from the backdrop instead of pressing "Select"
        fireEvent.press(screen.getByTestId('modal-backdrop'));
        await waitForBatchedUpdatesWithAct();

        // Then the menu closes without turning on selection mode or toggling the row
        expect(getSelectMenuItem()).toBeNull();
        expect(await getOnyxValue(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE)).toBeFalsy();
        expect(mockToggle).not.toHaveBeenCalled();
    });

    it('toggles the row directly when mobile selection mode is already on', async () => {
        // Given mobile selection mode is already on
        render(renderWithProviders({isMobileSelectionModeEnabled: true}));
        await waitForBatchedUpdatesWithAct();

        // When the user long-presses a row
        await longPressRow();

        // Then the row is toggled without opening the menu, because the user is already selecting
        expect(getSelectMenuItem()).toBeNull();
        expect(mockToggle).toHaveBeenCalledWith(ROW, ROW_TRANSACTIONS);
    });

    it.each([
        ['the row is disabled', {item: {...ROW, isDisabled: true} as SearchListItem}],
        ['the row checkbox is disabled', {item: {...ROW, isDisabledCheckbox: true} as SearchListItem}],
        ['the row is pending deletion', {item: {...ROW, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE} as SearchListItem}],
        ['the layout is wide', {isSmallScreenWidth: false}],
        ['the view prevents long press', {shouldPreventLongPressRow: true}],
    ])('does not open the menu when %s', async (_, props: LongPressHarnessProps) => {
        // Given a row that must not enter selection mode from a long press
        render(renderWithProviders(props));
        await waitForBatchedUpdatesWithAct();

        // When the user long-presses it
        await longPressRow();

        // Then no menu is shown and nothing is toggled
        expect(getSelectMenuItem()).toBeNull();
        expect(mockToggle).not.toHaveBeenCalled();
    });

    it('does not open the menu when the Search screen is not the current route', async () => {
        // Given another screen sits above the Search list
        mockGetCurrentRoute.mockReturnValue({key: 'Another-route-key', name: 'Report'});
        render(renderWithProviders());
        await waitForBatchedUpdatesWithAct();

        // When a long press still reaches the Search row
        await longPressRow();

        // Then it is ignored, so the menu does not open over the other screen
        expect(getSelectMenuItem()).toBeNull();
        expect(mockToggle).not.toHaveBeenCalled();
    });

    it('closes the menu when the list unmounts while it is open', async () => {
        // Given the menu was opened from a row
        const {rerender} = render(renderWithProviders());
        await waitForBatchedUpdatesWithAct();
        await longPressRow();
        expect(getSelectMenuItem()).toBeOnTheScreen();

        // When the list goes away while the menu is still open
        rerender(renderWithProviders({isListMounted: false}));
        await waitForBatchedUpdatesWithAct();

        // Then the menu is taken off the global stack too, and nothing is selected
        expect(getSelectMenuItem()).toBeNull();
        expect(mockToggle).not.toHaveBeenCalled();
    });
});

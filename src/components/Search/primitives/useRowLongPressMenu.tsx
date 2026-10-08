import {ModalActions} from '@components/Modal/Global/ModalContext';
import {useSearchRowSelectionActions} from '@components/Search/SearchContext';
import type {SearchListItem, TransactionListItemType} from '@components/Search/SearchList/ListItem/types';

import useMobileSelectionMenuModal from '@hooks/useMobileSelectionMenuModal';

import {turnOnMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import navigationRef from '@libs/Navigation/navigationRef';

import CONST from '@src/CONST';

import {useRoute} from '@react-navigation/native';
import {useEffect, useId, useRef} from 'react';

const MOBILE_SELECTION_MENU_ID_PREFIX = 'search-row-mobile-selection-menu-';

type UseRowLongPressMenuParams = {
    /** Whether long press should be suppressed entirely. */
    shouldPreventLongPressRow?: boolean;

    /** Narrow-layout flag. Long press is a narrow-only affordance. Uses isSmallScreenWidth (not
     *  shouldUseNarrowLayout) to dodge the issue #48675 race, so the caller passes it through. */
    isSmallScreenWidth: boolean;

    /** When mobile selection mode is already on, a long press toggles the row directly instead of
     *  opening the "select" menu. */
    isMobileSelectionModeEnabled: boolean;
};

type UseRowLongPressMenuResult = {
    /** The resolved long-press handler to hand to each row (mobile-mode toggle vs open-menu). */
    onLongPressRow: (item: SearchListItem, itemTransactions?: TransactionListItemType[]) => void;
};

/**
 * Owns the row long-press affordance: in mobile selection mode a long press toggles the row, otherwise
 * it opens the bottom-docked "Select" menu on the global modal stack. Once that menu closes after "Select"
 * was pressed, selection mode is turned on for the pressed row.
 * Extracted from SearchList so ExpenseFlatSearchView can reuse it. Must be used inside
 * SearchWriteActionsProvider so `toggle` resolves to the real action rather than the no-op default.
 */
function useRowLongPressMenu({shouldPreventLongPressRow, isSmallScreenWidth, isMobileSelectionModeEnabled}: UseRowLongPressMenuParams): UseRowLongPressMenuResult {
    const {toggle} = useSearchRowSelectionActions();
    const route = useRoute();
    const {showMobileSelectionMenu, closeModalByID} = useMobileSelectionMenuModal();

    // One ID per list, so a second long press updates the open menu instead of stacking another one, and the menu
    // can be taken down when the list goes away
    const mobileSelectionMenuID = `${MOBILE_SELECTION_MENU_ID_PREFIX}${useId()}`;

    // The menu resolves after its close animation, so select the row through the latest `toggle` rather than the one
    // that still sees the data and selection from the moment of the long press
    const toggleRef = useRef(toggle);
    useEffect(() => {
        toggleRef.current = toggle;
    });

    // The menu is no longer part of the list's tree, so close it if the list unmounts while it is open
    const closeModalByIDRef = useRef(closeModalByID);
    useEffect(() => {
        closeModalByIDRef.current = closeModalByID;
    });
    useEffect(() => () => closeModalByIDRef.current(mobileSelectionMenuID), [mobileSelectionMenuID]);

    const shouldIgnoreLongPress = (item: SearchListItem) => {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        if (currentRoute && route.key !== currentRoute.key) {
            return true;
        }

        return shouldPreventLongPressRow || !isSmallScreenWidth || item?.isDisabled || item?.isDisabledCheckbox || item.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
    };

    const handleLongPressRowInMobileSelectionMode = (item: SearchListItem, itemTransactions?: TransactionListItemType[]) => {
        if (shouldIgnoreLongPress(item)) {
            return;
        }

        toggle(item, itemTransactions);
    };

    const handleLongPressRow = (item: SearchListItem, itemTransactions?: TransactionListItemType[]) => {
        if (shouldIgnoreLongPress(item)) {
            return;
        }

        showMobileSelectionMenu({
            id: mobileSelectionMenuID,
            sentryLabel: CONST.SENTRY_LABEL.SEARCH.SELECTION_MODE_MENU_ITEM,
        }).then(({action}) => {
            if (action !== ModalActions.CONFIRM) {
                return;
            }

            turnOnMobileSelectionMode();
            toggleRef.current(item, itemTransactions);
        });
    };

    const onLongPressRow = isMobileSelectionModeEnabled ? handleLongPressRowInMobileSelectionMode : handleLongPressRow;

    return {onLongPressRow};
}

export default useRowLongPressMenu;

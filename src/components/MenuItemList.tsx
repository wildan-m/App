import useSingleExecution from '@hooks/useSingleExecution';

import mergeRefs from '@libs/mergeRefs';

import {showContextMenu} from '@pages/inbox/report/ContextMenu/ReportActionContextMenu';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';
import type IconAsset from '@src/types/utils/IconAsset';

import type {GestureResponderEvent, StyleProp, View, ViewStyle} from 'react-native';

import {useIsFocused} from '@react-navigation/native';
import React, {useRef} from 'react';
import {useOnyx} from 'react-native-onyx';

import type {MenuItemProps} from './MenuItem';

import MenuItem from './MenuItem';
import OfflineWithFeedback from './OfflineWithFeedback';

type MenuItemLink = string | (() => Promise<string>);

type MenuItemWithLink = MenuItemProps & {
    /** The link to open when the menu item is clicked */
    link?: MenuItemLink;

    /** A unique key for the menu item */
    key?: string;

    /** The pending action for the menu item */
    pendingAction?: OnyxCommon.PendingAction | null;

    /** A function to dismiss the pending action */
    onPendingActionDismiss?: () => void;

    /** The error for the menu item */
    error?: OnyxCommon.Errors | null;

    /** Whether we should force opacity */
    shouldForceOpacity?: boolean;
};

type MenuItemListProps = {
    /** An array of props that are pass to individual MenuItem components */
    menuItems: MenuItemWithLink[];

    /** Whether or not to use the single execution hook */
    shouldUseSingleExecution?: boolean;

    /** Any additional styles to apply for each item */
    wrapperStyle?: StyleProp<ViewStyle>;

    /** Icon to display on the left side of each item */
    icon?: IconAsset;

    /** Icon Width */
    iconWidth?: number;

    /** Icon Height */
    iconHeight?: number;
};

function MenuItemList({menuItems = [], shouldUseSingleExecution = false, wrapperStyle = {}, icon = undefined, iconWidth = undefined, iconHeight = undefined}: MenuItemListProps) {
    const popoverAnchor = useRef<View>(null);
    const {isExecuting, singleExecution} = useSingleExecution();
    const isFocused = useIsFocused();
    const [modal] = useOnyx(ONYXKEYS.MODAL, {canBeMissing: true});

    // A covering alert modal (e.g. a delete confirmation) is drawn on top of the current screen without changing the
    // navigation route, so the screen keeps its navigation focus. Treat such a modal as a loss of focus so each row's
    // hover highlight is cleared while it is covered. Popover/bottom-docked menus are excluded so ordinary menus don't wipe hover.
    const isCoveredByAlertModal = !!modal?.willAlertModalBecomeVisible && !modal?.isPopover;

    /**
     * Handle the secondary interaction for a menu item.
     *
     * @param link the menu item link or function to get the link
     * @param event the interaction event
     */
    const secondaryInteraction = (link: MenuItemLink | undefined, event: GestureResponderEvent | MouseEvent) => {
        if (typeof link === 'function') {
            link().then((url) =>
                showContextMenu({
                    type: CONST.CONTEXT_MENU_TYPES.LINK,
                    event,
                    selection: url,
                    contextMenuAnchor: popoverAnchor.current,
                }),
            );
        } else if (link) {
            showContextMenu({
                type: CONST.CONTEXT_MENU_TYPES.LINK,
                event,
                selection: link,
                contextMenuAnchor: popoverAnchor.current,
            });
        }
    };

    return (
        // ref is accessed for MenuItem's ref initialization
        menuItems.map(({key, ref, ...menuItemProps}) => (
            <OfflineWithFeedback
                key={key ?? menuItemProps.title}
                pendingAction={menuItemProps.pendingAction}
                onClose={menuItemProps.onPendingActionDismiss}
                errors={menuItemProps.error}
                shouldForceOpacity={menuItemProps.shouldForceOpacity}
            >
                <MenuItem
                    key={key ?? menuItemProps.title}
                    wrapperStyle={wrapperStyle}
                    onSecondaryInteraction={menuItemProps.link !== undefined ? (e) => secondaryInteraction(menuItemProps.link, e) : undefined}
                    shouldShowContextMenuHint={menuItemProps.shouldShowContextMenuHint ?? menuItemProps.link !== undefined}
                    ref={mergeRefs(ref, popoverAnchor)}
                    shouldBlockSelection={!!menuItemProps.link}
                    icon={icon}
                    iconWidth={iconWidth}
                    iconHeight={iconHeight}
                    {...menuItemProps}
                    disabled={!!menuItemProps.disabled || isExecuting}
                    onPress={shouldUseSingleExecution ? singleExecution(menuItemProps.onPress) : menuItemProps.onPress}
                    isFocused={isFocused && !isCoveredByAlertModal}
                />
            </OfflineWithFeedback>
        ))
    );
}

export type {MenuItemWithLink};
export default MenuItemList;

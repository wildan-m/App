import FocusableMenuItem from '@components/FocusableMenuItem';
import type {MenuItemProps} from '@components/MenuItem';

import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import type {ThemeColors} from '@styles/theme/types';
import variables from '@styles/variables';

import CONST from '@src/CONST';
import type {WithRequiredSentryLabel} from '@src/types/utils/SentryLabel';

import React from 'react';

import useFABMenuItem from './useFABMenuItem';

type FABFocusableMenuItemProps = Omit<MenuItemProps, 'focused' | 'onFocus' | 'wrapperStyle' | 'shouldCheckActionAllowedOnPress' | 'role' | 'onPress'> &
    WithRequiredSentryLabel & {
        itemId: string;
        isVisible?: boolean;
        onPress?: () => void;
        shouldCallAfterModalHide?: boolean;

        /** Which create-menu color pair draws the rounded tile behind the icon; omitted means no tile */
        tile?: keyof ThemeColors['createMenuTile'];
    };

function FABFocusableMenuItem({itemId, isVisible = true, onPress, shouldCallAfterModalHide, sentryLabel, tile, ...props}: FABFocusableMenuItemProps) {
    const {itemIndex, isFocused, wrapperStyle, setFocusedIndex, onItemPress} = useFABMenuItem(itemId, isVisible);
    const theme = useTheme();
    const styles = useThemeStyles();
    const tileColors = tile ? theme.createMenuTile[tile] : undefined;

    if (!isVisible) {
        return null;
    }

    return (
        <FocusableMenuItem
            // FABFocusableMenuItemProps is a strict subset of MenuItemProps — spreading forwards all remaining props safely

            {...(props as MenuItemProps)}
            sentryLabel={sentryLabel}
            focused={isFocused}
            onFocus={() => setFocusedIndex(itemIndex)}
            wrapperStyle={wrapperStyle}
            shouldCheckActionAllowedOnPress={false}
            role={CONST.ROLE.BUTTON}
            onPress={onPress ? () => onItemPress(onPress, {shouldCallAfterModalHide}) : undefined}
            // The tile overrides any icon sizing the row passed, so every tiled row renders identically
            {...(tileColors
                ? {
                      iconStyles: [styles.createMenuIconTile, {backgroundColor: tileColors.backgroundColor}],
                      iconWidth: variables.iconSizeSmall,
                      iconHeight: variables.iconSizeSmall,
                      iconFill: tileColors.fill,
                      iconContainerSize: variables.createMenuIconTileSize,
                  }
                : {})}
        />
    );
}

export default FABFocusableMenuItem;

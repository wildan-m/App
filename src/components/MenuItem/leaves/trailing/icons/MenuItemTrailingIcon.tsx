import Icon from '@components/Icon';
import {useMenuItemConfig, useMenuItemInteraction} from '@components/MenuItem/MenuItemContext';

import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import getButtonState from '@libs/getButtonState';

import variables from '@styles/variables';

import type IconAsset from '@src/types/utils/IconAsset';
import type WithTestID from '@src/types/utils/TestID';

import React from 'react';
import {View} from 'react-native';

type MenuItemTrailingIconProps = WithTestID & {
    /** The icon to render, e.g. a lock on a row whose value comes from an integration */
    src: IconAsset;
};

/**
 * A trailing icon of a `MenuItem.Row` that no dedicated leaf covers. Unlike the chevron it stays at full
 * opacity and brightens with the row, the same as the legacy `iconRight` did for any icon but the arrow.
 *
 * Reach for `MenuItem.Chevron` or `MenuItem.NewWindowIcon` instead when the icon means navigation or an
 * external link, since those also carry the row's dimming and announcement rules.
 */
function MenuItemTrailingIcon({src, testID}: MenuItemTrailingIconProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {isDisabled, isInteractive} = useMenuItemConfig();
    const {isHovered, isPressed, isActive} = useMenuItemInteraction();

    return (
        <View
            style={[styles.menuItemTrailingIcon, isDisabled && styles.cursorDisabled]}
            testID={testID}
        >
            <Icon
                src={src}
                fill={StyleUtils.getIconFillColor({buttonState: getButtonState({isActive: isActive || isHovered, isPressed, isDisabled, isInteractive})})}
                width={variables.iconSizeNormal}
                height={variables.iconSizeNormal}
            />
        </View>
    );
}

export default MenuItemTrailingIcon;
export type {MenuItemTrailingIconProps};

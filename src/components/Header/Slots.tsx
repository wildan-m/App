import useThemeStyles from '@hooks/useThemeStyles';

import type ChildrenProps from '@src/types/utils/ChildrenProps';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type HeaderSlotProps = ChildrenProps & {
    /** Additional styles for the slot container */
    style?: StyleProp<ViewStyle>;
};

/** Groups leading content (back button, icons, avatars) at the start of the header bar */
function HeaderLeft({children, style}: HeaderSlotProps) {
    const styles = useThemeStyles();
    return <View style={[styles.flexRow, styles.alignItemsCenter, style]}>{children}</View>;
}

/** Flexible center area of the header bar (title, avatar, progress bar) */
function HeaderCenter({children, style}: HeaderSlotProps) {
    const styles = useThemeStyles();
    return <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter, styles.overflowHidden, style]}>{children}</View>;
}

/** Groups trailing action buttons at the end of the header bar */
function HeaderRight({children, style}: HeaderSlotProps) {
    const styles = useThemeStyles();
    return <View style={[styles.reportOptions, styles.flexRow, styles.alignItemsCenter, style]}>{children}</View>;
}

export {HeaderLeft, HeaderCenter, HeaderRight};
export type {HeaderSlotProps};

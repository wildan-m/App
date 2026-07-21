import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import type ChildrenProps from '@src/types/utils/ChildrenProps';

import type {StyleProp, ViewStyle} from 'react-native';

import React, {useMemo} from 'react';
import {Keyboard, StyleSheet, View} from 'react-native';

import HeaderContext from './HeaderContext';

type HeaderRootProps = ChildrenProps & {
    /** Whether to show a border on the bottom of the header bar */
    shouldShowBorderBottom?: boolean;

    /** Whether the header should use the taller headline header style */
    shouldUseHeadlineHeader?: boolean;

    /** Whether the header should overlay the current view (absolute fill) */
    shouldOverlay?: boolean;

    /** Fill color inherited by header icon buttons via HeaderContext */
    iconFill?: string;

    /** Additional styles for the header bar */
    style?: StyleProp<ViewStyle>;
};

function HeaderRoot({children, shouldShowBorderBottom = false, shouldUseHeadlineHeader = false, shouldOverlay = false, iconFill, style}: HeaderRootProps) {
    const styles = useThemeStyles();
    const isInLandscapeMode = useIsInLandscapeMode();
    const contextValue = useMemo(() => ({iconFill}), [iconFill]);

    return (
        <HeaderContext.Provider value={contextValue}>
            <View
                style={[styles.headerBar, shouldUseHeadlineHeader && styles.headerBarHeight, shouldShowBorderBottom && styles.borderBottom, shouldOverlay && StyleSheet.absoluteFill, style]}
                onTouchStart={isInLandscapeMode ? () => Keyboard.dismiss() : undefined}
            >
                <View style={[styles.dFlex, styles.flexRow, styles.alignItemsCenter, styles.flexGrow1, styles.justifyContentBetween, styles.overflowHidden, styles.mr3]}>{children}</View>
            </View>
        </HeaderContext.Provider>
    );
}

export default HeaderRoot;
export type {HeaderRootProps};

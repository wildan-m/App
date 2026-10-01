import DebugTabView from '@components/Navigation/DebugTabView';
import NavigationTabBar from '@components/Navigation/NavigationTabBar';

import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import type TabBarBottomContentProps from './types';

function TabBarBottomContent({selectedTab}: TabBarBottomContentProps) {
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [isDebugModeEnabled] = useOnyx(ONYXKEYS.IS_DEBUG_MODE_ENABLED);

    if (!shouldUseNarrowLayout) {
        return null;
    }

    return (
        <>
            {/* On web the split navigator card is position: fixed, so it doesn't shrink with the tab scene when the
                real tab bar shows the debug banner above itself. This invisible copy reserves the same space so the
                bottom of the screen content isn't hidden behind the banner. DebugTabView renders nothing whenever
                the real banner is hidden, so no space is reserved in that case. */}
            {!!isDebugModeEnabled && (
                <View
                    style={[styles.opacity0, styles.pointerEventsNone]}
                    aria-hidden
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                >
                    <DebugTabView selectedTab={selectedTab} />
                </View>
            )}
            <NavigationTabBar
                selectedTab={selectedTab}
                shouldShowFloatingButtons={false}
            />
        </>
    );
}

export default TabBarBottomContent;

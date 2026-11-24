import type {StyleProp, ViewStyle} from 'react-native';
import type {CSSStyle} from 'react-native-reanimated';

import React from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {css} from 'react-native-reanimated';

import type SkeletonViewContentLoaderProps from './types';

import SkeletonFillContext from './SkeletonFillContext';
import toDimensionValue from './toDimensionValue';

// Defaults mirror react-content-loader, which this component replaces
const DEFAULT_SPEED_SECONDS = 1.2;
const DEFAULT_BACKGROUND_COLOR = '#f5f6f7';
const DEFAULT_FOREGROUND_COLOR = '#eee';

// Crossfades the foreground copy of the shapes over the background copy, standing in for the old SVG gradient sweep
const shimmer = css.keyframes({
    from: {opacity: 0},
    '50%': {opacity: 1},
    to: {opacity: 0},
});

function SkeletonViewContentLoader({
    animate = true,
    speed = DEFAULT_SPEED_SECONDS,
    width,
    height,
    backgroundColor = DEFAULT_BACKGROUND_COLOR,
    foregroundColor = DEFAULT_FOREGROUND_COLOR,
    style,
    testID,
    children,
}: SkeletonViewContentLoaderProps) {
    // The container clips overflowing shapes the way the old SVG viewport did
    const containerStyle: StyleProp<ViewStyle> = [{width: toDimensionValue(width) ?? '100%', height: toDimensionValue(height), overflow: 'hidden'}, style];

    const shimmerStyle: CSSStyle<ViewStyle> = {
        animationName: shimmer,
        animationDuration: speed * 1000,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
    };

    return (
        <View
            style={containerStyle}
            testID={testID}
        >
            <SkeletonFillContext.Provider value={backgroundColor}>{children}</SkeletonFillContext.Provider>
            {animate && (
                <SkeletonFillContext.Provider value={foregroundColor}>
                    <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>{children}</Animated.View>
                </SkeletonFillContext.Provider>
            )}
        </View>
    );
}

export default SkeletonViewContentLoader;

import SkeletonRect from '@components/SkeletonRect';
import SkeletonViewContentLoader from '@components/SkeletonViewContentLoader';

import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

const SKELETON_HEIGHT = 20;
const BAR_HEIGHT = 8;
const BAR_VERTICAL_OFFSET = (SKELETON_HEIGHT - BAR_HEIGHT) / 2;
const TOTAL_BAR_WIDTH = 110;
const skeletonContainerStyle = {height: SKELETON_HEIGHT, width: TOTAL_BAR_WIDTH};

/** Placeholder for the footer total value while a totals refresh or currency conversion is in flight. The labels and the
 * count stay rendered around it, so the footer keeps its height. */
function SearchPageFooterSkeleton() {
    const styles = useThemeStyles();
    const theme = useTheme();

    return (
        <View style={[styles.overflowHidden, skeletonContainerStyle]}>
            <SkeletonViewContentLoader
                height={SKELETON_HEIGHT}
                width={TOTAL_BAR_WIDTH}
                backgroundColor={theme.skeletonLHNIn}
                foregroundColor={theme.skeletonLHNOut}
            >
                <SkeletonRect
                    transform={[{translateY: BAR_VERTICAL_OFFSET}]}
                    width={TOTAL_BAR_WIDTH}
                    height={BAR_HEIGHT}
                />
            </SkeletonViewContentLoader>
        </View>
    );
}

export default SearchPageFooterSkeleton;

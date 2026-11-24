import SkeletonFillContext from '@components/SkeletonViewContentLoader/SkeletonFillContext';
import toDimensionValue from '@components/SkeletonViewContentLoader/toDimensionValue';

import type {ViewStyle} from 'react-native';

import React, {useContext} from 'react';
import {View} from 'react-native';

const BORDER_RADIUS_SMALL = 2; // text bars (height <= 8)
const BORDER_RADIUS_MEDIUM = 4; // content blocks (height > 8)
const HEIGHT_THRESHOLD = 8;

// SVG-style dimension kept for drop-in compatibility: a number, a numeric string or a percentage string
type SkeletonDimension = number | string;

type SkeletonRectProps = {
    /** Width of the bar; percentages resolve against the skeleton canvas */
    width?: SkeletonDimension;

    /** Height of the bar */
    height?: SkeletonDimension;

    /** Translate transforms positioning the bar on the canvas */
    transform?: ViewStyle['transform'];

    /** Sets the corner radius. Auto-derived from height when omitted. */
    borderRadius?: number;
};

function getDefaultRadius(height: SkeletonDimension | undefined): number {
    const num = typeof height === 'number' ? height : parseFloat(String(height));
    if (Number.isNaN(num)) {
        return BORDER_RADIUS_MEDIUM;
    }
    return num <= HEIGHT_THRESHOLD ? BORDER_RADIUS_SMALL : BORDER_RADIUS_MEDIUM;
}

function SkeletonRect({width, height, transform, borderRadius}: SkeletonRectProps) {
    const fill = useContext(SkeletonFillContext);
    const radius = borderRadius ?? getDefaultRadius(height);
    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: toDimensionValue(width),
                height: toDimensionValue(height),
                borderRadius: radius,
                backgroundColor: fill,
                transform,
            }}
        />
    );
}

export default SkeletonRect;

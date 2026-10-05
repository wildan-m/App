import type {PointsArray} from 'victory-native';

import {DashPathEffect, Path} from '@shopify/react-native-skia';
import React from 'react';
import {useLinePath} from 'victory-native';

type DashedLineSegmentProps = {
    /** Data points the dashed segment is drawn through */
    points: PointsArray;

    /** Stroke color of the segment */
    color: string;

    /** Stroke width of the segment */
    strokeWidth: number;
};

/** On/off stroke lengths of the dash pattern, in pixels */
const DASH_INTERVALS = [6, 6];

/**
 * Draws a dashed line through the given points. Used for the segment leading into an in-progress
 * period, which is rendered dashed to show its data is still accruing. victory-native's `Line`
 * doesn't forward children to its underlying `Path`, so the dash effect needs its own component.
 */
function DashedLineSegment({points, color, strokeWidth}: DashedLineSegmentProps) {
    const {path} = useLinePath(points, {curveType: 'linear'});

    return (
        <Path
            path={path}
            // eslint-disable-next-line react/style-prop-object -- this is a valid Skia style prop value
            style="stroke"
            color={color}
            strokeWidth={strokeWidth}
        >
            <DashPathEffect intervals={DASH_INTERVALS} />
        </Path>
    );
}

export default DashedLineSegment;

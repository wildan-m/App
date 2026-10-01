import type {DerivedValue, SharedValue} from 'react-native-reanimated';

import {Circle, Line, vec} from '@shopify/react-native-skia';
import React from 'react';
import {useDerivedValue} from 'react-native-reanimated';

type ActivePointMarkerProps = {
    /** Canvas position of the hovered or tapped point */
    position: DerivedValue<{x: number; y: number}>;

    /** True while the point's tooltip is shown */
    isActive: DerivedValue<boolean> | SharedValue<boolean>;

    /** Top of the plot area, where the guideline starts */
    plotTop: number;

    /** Bottom of the plot area, where the guideline ends */
    plotBottom: number;

    /** Radius of the dot drawn on the line */
    radius: number;

    /** Fill color of the dot */
    color: string;

    /** Color of the vertical guideline */
    guidelineColor: string;

    /** Color of the ring around the dot, matching the chart background so the dot reads as sitting on top of the line */
    ringColor: string;
};

/** Width of the ring around the dot */
const DOT_MARGIN = 2;

/** Marks the active point of a line chart with a dot on the line and a vertical guideline through its bucket. Nothing is drawn at rest. */
function ActivePointMarker({position, isActive, plotTop, plotBottom, radius, color, guidelineColor, ringColor}: ActivePointMarkerProps) {
    const opacity = useDerivedValue(() => (isActive.get() ? 1 : 0));
    const cx = useDerivedValue(() => position.get().x);
    const cy = useDerivedValue(() => position.get().y);
    const guidelineStart = useDerivedValue(() => vec(position.get().x, plotTop));
    const guidelineEnd = useDerivedValue(() => vec(position.get().x, plotBottom));

    return (
        <>
            <Line
                p1={guidelineStart}
                p2={guidelineEnd}
                color={guidelineColor}
                strokeWidth={1}
                opacity={opacity}
            />
            <Circle
                cx={cx}
                cy={cy}
                r={radius + DOT_MARGIN}
                color={ringColor}
                opacity={opacity}
            />
            <Circle
                cx={cx}
                cy={cy}
                r={radius}
                color={color}
                opacity={opacity}
            />
        </>
    );
}

export default ActivePointMarker;

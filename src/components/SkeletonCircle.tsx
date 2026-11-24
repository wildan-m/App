import SkeletonFillContext from '@components/SkeletonViewContentLoader/SkeletonFillContext';

import React, {useContext} from 'react';
import {View} from 'react-native';

// SVG-style circle geometry kept for drop-in compatibility: center coordinates and radius, numbers or numeric strings
type SkeletonCircleProps = {
    /** Horizontal center of the circle on the skeleton canvas */
    cx: number | string;

    /** Vertical center of the circle on the skeleton canvas */
    cy: number | string;

    /** Radius of the circle */
    r: number | string;
};

function SkeletonCircle({cx, cy, r}: SkeletonCircleProps) {
    const fill = useContext(SkeletonFillContext);
    const radius = Number(r);
    const size = radius * 2;
    return (
        <View
            style={{
                position: 'absolute',
                left: Number(cx) - radius,
                top: Number(cy) - radius,
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: fill,
            }}
        />
    );
}

export default SkeletonCircle;

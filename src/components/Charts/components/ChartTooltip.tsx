import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ComponentRef} from 'react';
import type {SharedValue} from 'react-native-reanimated';

import React, {useLayoutEffect, useRef} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, useSharedValue} from 'react-native-reanimated';

type ChartTooltipProps = {
    /** Label text (e.g., "Airfare", "Amazon") */
    label: string;

    /** Formatted amount (e.g., "$1,820.00") */
    amount: string;

    /** Optional percentage to display (e.g., "12%") */
    percentage?: string;

    /** Optional expense count line (e.g., "841 expenses") */
    count?: string;

    /** The width of the chart container */
    chartWidth: number;

    initialTooltipPosition: SharedValue<{x: number; y: number}>;
};

function getAmountLine(amount: string, percentage?: string): string {
    if (!percentage) {
        return amount;
    }

    return `${amount} (${percentage})`;
}

function ChartTooltip({label, amount, percentage, count, chartWidth, initialTooltipPosition}: ChartTooltipProps) {
    const styles = useThemeStyles();

    /** Shared value to store the measured width of the tooltip container */
    const tooltipMeasuredWidth = useSharedValue(0);

    const amountLine = amount ? getAmountLine(amount, percentage) : '';
    const content = [label, amountLine, count].join('|');

    /**
     * Synchronously reset the width and hide the tooltip whenever the content changes.
     * This prevents the "old" dimensions from being used to calculate the position
     * of "new" content, avoiding visual jumps or "ghosting" effects.
     */
    const tooltipWrapperRef = useRef<ComponentRef<typeof View>>(null);

    useLayoutEffect(() => {
        tooltipWrapperRef.current?.measure((x: number, y: number, width: number) => {
            if (width <= 0) {
                return;
            }
            tooltipMeasuredWidth.set(width);
        });
    }, [content, tooltipMeasuredWidth]);

    /** Calculate the center point, ensuring the box doesn't overflow the left or right edges */
    const clampedCenter = useDerivedValue(() => {
        const {x} = initialTooltipPosition.get();
        const width = tooltipMeasuredWidth.get();
        const halfWidth = width / 2;

        return Math.max(halfWidth, Math.min(chartWidth - halfWidth, x));
    }, [initialTooltipPosition, tooltipMeasuredWidth, chartWidth]);

    /**
     * Animated style for the main tooltip container.
     * Calculates the clamped center to keep the box within chart boundaries.
     */
    const tooltipStyle = useAnimatedStyle(() => {
        const {y} = initialTooltipPosition.get();

        return {
            position: 'absolute',
            left: clampedCenter.get(),
            top: y,
            /** Center the wrapper horizontally and lift it entirely above the Y point */
            transform: [{translateX: '-50%'}, {translateY: '-100%'}],
            opacity: tooltipMeasuredWidth.get() > 0 ? 1 : 0,
        };
    }, [initialTooltipPosition]);

    return (
        <Animated.View
            style={tooltipStyle}
            pointerEvents="none"
            ref={tooltipWrapperRef}
        >
            <View style={styles.chartTooltipWrapper}>
                <View style={styles.chartTooltipBox}>
                    <Text
                        style={styles.chartTooltipLabel}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                    {!!amountLine && (
                        <Text
                            style={styles.chartTooltipText}
                            numberOfLines={1}
                        >
                            {amountLine}
                        </Text>
                    )}
                    {!!count && (
                        <Text
                            style={styles.chartTooltipText}
                            numberOfLines={1}
                        >
                            {count}
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

ChartTooltip.displayName = 'ChartTooltip';

export default ChartTooltip;

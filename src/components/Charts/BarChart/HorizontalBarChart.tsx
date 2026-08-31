import BAR_INNER_PADDING, {CATEGORY_LABEL_MAX_WIDTH_RATIO, MIN_BAR_ROW_HEIGHT} from '@components/Charts/barChartConstants';
import ChartTooltipLayer from '@components/Charts/components/ChartTooltipLayer';
import ChartYAxisLabels from '@components/Charts/components/ChartYAxisLabels';
import type {HitTestArgs, ResolveTargetIndexArgs} from '@components/Charts/hooks';
import {useChartInteractions, useChartParagraphs} from '@components/Charts/hooks';
import {getFontLineMetrics, getXAxisLabel, measureTextWidth, truncateLabel} from '@components/Charts/utils';
import VictoryTheme, {CHART_CONTENT_MIN_HEIGHT, ELLIPSIS, GLYPH_PADDING, MAX_Y_AXIS_LABEL_WIDTH} from '@components/Charts/VictoryTheme';

import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import type {SkTypefaceFontProvider} from '@shopify/react-native-skia';
import type {CartesianChartRenderArg, ChartBounds, PointsArray, Scale} from 'victory-native';

import {Paragraph, RoundedRect} from '@shopify/react-native-skia';
import React from 'react';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';
import {CartesianChart} from 'victory-native';

import type {ChartDataPoint} from '..';

/** Corner radius of each bar, matching the vertical bar chart's rounded corners */
const BAR_CORNER_RADIUS = 8;

type ValueAxisLabelsProps = {
    /** Tick values on the value (horizontal) axis. */
    xTicks: number[];

    /** Maps a tick value to its x-pixel position. */
    xScale: Scale;

    /** Y-pixel coordinate of the bottom edge of the chart plot area. */
    chartBoundsBottom: number;

    /** Font size used for rendering labels. */
    fontSize: number;

    /** Font manager for Paragraph API rendering with multi-font fallback. */
    fontManager: SkTypefaceFontProvider;

    /** Fill color for the label text. */
    labelColor: string;

    /** Formats a tick value to its display string. */
    formatValue: (value: number) => string;
};

/** Renders the numeric value labels below the plot area of the horizontal bar chart. */
function ValueAxisLabels({xTicks, xScale, chartBoundsBottom, fontSize, fontManager, labelColor, formatValue}: ValueAxisLabelsProps) {
    const formattedLabels = xTicks.map((tick) => formatValue(tick));
    const paragraphs = useChartParagraphs(formattedLabels, fontManager, fontSize, labelColor, MAX_Y_AXIS_LABEL_WIDTH);
    const labelY = chartBoundsBottom + VictoryTheme.axis.labelGap;

    return xTicks.map((tick, i) => {
        const paraData = paragraphs.at(i);
        if (!paraData?.para) {
            return null;
        }

        return (
            <Paragraph
                key={`value-label-${tick}`}
                paragraph={paraData.para}
                x={xScale(tick) - paraData.width / 2}
                y={labelY}
                width={paraData.width + GLYPH_PADDING}
            />
        );
    });
}

type HorizontalBarChartProps = {
    /** Chart data points to render as horizontal bars */
    data: ChartDataPoint[];

    /** Measured width of the chart container */
    chartWidth: number;

    /** Font manager for Paragraph API rendering with multi-font fallback */
    fontManager: SkTypefaceFontProvider;

    /** Formats a numeric value for display */
    formatValue: (value: number) => string;

    /** Value-axis domain anchor ([0] to pin the baseline at zero, undefined to auto-scale negatives) */
    valueDomain: [number] | undefined;

    /** When true, all bars use the same color. When false, each bar uses a different color from the palette. */
    useSingleColor: boolean;

    /** Callback when a bar is pressed, given its data index */
    onBarPress: (index: number) => void;
};

/**
 * Renders bar chart data as horizontal bars with category labels on the Y axis and value labels
 * on the X axis. Used as a fallback when x-axis category labels don't fit at 0° or 45° rotation.
 */
function HorizontalBarChart({data, chartWidth, fontManager, formatValue, valueDomain, useSingleColor, onBarPress}: HorizontalBarChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const fontSize = variables.iconSizeExtraSmall;
    const defaultBarColor = VictoryTheme.colors.default;
    const rowCount = data.length;

    // Transposed mapping: value on the x axis, row position on the y axis, first data point on the top row.
    const chartData = data.map((point, index) => ({
        x: point.total,
        y: rowCount - 1 - index,
    }));

    // Category labels, truncated to the label column width.
    const ellipsisWidth = measureTextWidth(ELLIPSIS, fontManager, fontSize);
    const categoryLabels = data.map(getXAxisLabel);
    const categoryLabelWidths = categoryLabels.map((label) => measureTextWidth(label, fontManager, fontSize));
    const labelColumnWidth = Math.min(Math.max(...categoryLabelWidths), MAX_Y_AXIS_LABEL_WIDTH, chartWidth * CATEGORY_LABEL_MAX_WIDTH_RATIO);
    const truncatedCategoryLabels = categoryLabels.map((label, i) => truncateLabel(label, categoryLabelWidths.at(i) ?? 0, labelColumnWidth, ellipsisWidth));

    const rowTicks = chartData.map((point) => point.y);
    const rowDomain: [number, number] = [-0.5, rowCount - 0.5];
    const formatRowLabel = (tick: number) => truncatedCategoryLabels.at(rowCount - 1 - tick) ?? '';

    const {ascent, descent} = getFontLineMetrics(fontManager, fontSize);
    const valueLabelSpace = VictoryTheme.axis.labelGap + ascent + descent;

    // Half the widest value label can overhang past the last tick, so reserve room for it.
    const maxTotal = Math.max(...data.map((point) => point.total));
    const minTotal = Math.min(...data.map((point) => point.total));
    const widestValueLabelWidth = Math.max(measureTextWidth(formatValue(maxTotal), fontManager, fontSize), measureTextWidth(formatValue(minTotal), fontManager, fontSize));

    const chartPadding = {
        ...VictoryTheme.axis.padding,
        left: labelColumnWidth + VictoryTheme.axis.labelGap,
        right: VictoryTheme.axis.padding.right + widestValueLabelWidth / 2,
        bottom: VictoryTheme.axis.padding.bottom + valueLabelSpace,
    };

    // The chart grows with the number of rows so every category keeps a legible row.
    const chartHeight = Math.max(CHART_CONTENT_MIN_HEIGHT, rowCount * MIN_BAR_ROW_HEIGHT + VictoryTheme.axis.padding.top + chartPadding.bottom);

    const barThickness = useSharedValue(0);
    const zeroX = useSharedValue(0);

    const handleChartBoundsChange = (bounds: ChartBounds) => {
        const slotHeight = rowCount > 0 ? (bounds.bottom - bounds.top) / rowCount : 0;
        barThickness.set((1 - BAR_INNER_PADDING) * slotHeight);
    };

    const checkIsOverHorizontalBar = (args: HitTestArgs) => {
        'worklet';

        const currentThickness = barThickness.get();
        const currentZeroX = zeroX.get();
        if (currentThickness === 0) {
            return false;
        }

        const barLeft = Math.min(currentZeroX, args.targetX);
        const barRight = Math.max(currentZeroX, args.targetX);
        const barTop = args.targetY - currentThickness / 2;
        const barBottom = args.targetY + currentThickness / 2;

        return args.cursorX >= barLeft && args.cursorX <= barRight && args.cursorY >= barTop && args.cursorY <= barBottom;
    };

    // Rows are matched by vertical distance, unlike the vertical chart's nearest-point-by-X default.
    const resolveNearestRow = ({cursorY, pointY}: ResolveTargetIndexArgs) => {
        'worklet';

        let nearestIndex = -1;
        let nearestDistance = Infinity;
        for (let i = 0; i < pointY.length; i++) {
            const distance = Math.abs((pointY.at(i) ?? 0) - cursorY);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }
        return nearestIndex;
    };

    const {customGestures, setPointPositions, matchedIndex, isTooltipActive, isCursorOverClickable, initialTooltipPosition} = useChartInteractions({
        handlePress: onBarPress,
        checkIsOver: checkIsOverHorizontalBar,
        resolveTargetIndex: resolveNearestRow,
    });

    const handleScaleChange = (xScale: Scale, yScale: Scale) => {
        zeroX.set(xScale(0));
        setPointPositions(
            chartData.map((point) => xScale(point.x)),
            chartData.map((point) => yScale(point.y)),
        );
    };

    const cursorStyle = useAnimatedStyle(() => ({
        cursor: isCursorOverClickable.get() ? 'pointer' : 'auto',
    }));

    const renderHorizontalBar = (point: PointsArray[number], currentZeroX: number, currentBarThickness: number) => {
        if (typeof point.y !== 'number' || typeof point.yValue !== 'number') {
            return null;
        }

        const dataIndex = rowCount - 1 - point.yValue;
        const dataPoint = data.at(dataIndex);
        const barColor = useSingleColor ? defaultBarColor : VictoryTheme.colors.getColor(dataIndex);

        return (
            <RoundedRect
                key={`bar-${dataPoint?.label}`}
                x={Math.min(currentZeroX, point.x)}
                y={point.y - currentBarThickness / 2}
                width={Math.abs(point.x - currentZeroX)}
                height={currentBarThickness}
                r={BAR_CORNER_RADIUS}
                color={barColor}
            />
        );
    };

    const renderOutside = (args: CartesianChartRenderArg<{x: number; y: number}, 'y'>) => (
        <>
            <ChartYAxisLabels
                yTicks={rowTicks}
                yScale={args.yScale}
                chartBounds={args.chartBounds}
                fontSize={fontSize}
                fontManager={fontManager}
                labelColor={theme.textSupporting}
                formatValue={formatRowLabel}
            />
            <ValueAxisLabels
                xTicks={args.xTicks}
                xScale={args.xScale}
                chartBoundsBottom={args.chartBounds.bottom}
                fontSize={fontSize}
                fontManager={fontManager}
                labelColor={theme.textSupporting}
                formatValue={formatValue}
            />
        </>
    );

    return (
        <GestureDetector gesture={customGestures}>
            <Animated.View style={[styles.chartContent, {height: chartHeight}, cursorStyle]}>
                {chartWidth > 0 && (
                    <CartesianChart
                        xKey="x"
                        padding={chartPadding}
                        yKeys={['y']}
                        domain={{x: valueDomain, y: rowDomain}}
                        onChartBoundsChange={handleChartBoundsChange}
                        onScaleChange={handleScaleChange}
                        renderOutside={renderOutside}
                        xAxis={{
                            tickCount: VictoryTheme.axis.tickCount,
                            lineWidth: VictoryTheme.axis.yLineWidth,
                            lineColor: theme.border,
                        }}
                        yAxis={[
                            {
                                tickCount: rowCount,
                                lineWidth: VictoryTheme.axis.xLineWidth,
                            },
                        ]}
                        frame={{lineWidth: 0}}
                        data={chartData}
                    >
                        {({points, chartBounds, xScale}) => {
                            const slotHeight = rowCount > 0 ? (chartBounds.bottom - chartBounds.top) / rowCount : 0;
                            const currentBarThickness = (1 - BAR_INNER_PADDING) * slotHeight;
                            return points.y.map((point) => renderHorizontalBar(point, xScale(0), currentBarThickness));
                        }}
                    </CartesianChart>
                )}
                <ChartTooltipLayer
                    matchedIndex={matchedIndex}
                    isTooltipActive={isTooltipActive}
                    data={data}
                    formatValue={formatValue}
                    chartWidth={chartWidth}
                    initialTooltipPosition={initialTooltipPosition}
                />
            </Animated.View>
        </GestureDetector>
    );
}

export default HorizontalBarChart;
export type {HorizontalBarChartProps};

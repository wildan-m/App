import ActivityIndicator from '@components/ActivityIndicator';
import {BAR_CORNER_RADIUS, BAR_GAP} from '@components/Charts/barChartConstants';
import ChartTooltipLayer from '@components/Charts/components/ChartTooltipLayer';
import ChartXAxisLabels from '@components/Charts/components/ChartXAxisLabels';
import ChartYAxisLabels from '@components/Charts/components/ChartYAxisLabels';
import type {HitTestArgs} from '@components/Charts/hooks';
import {
    useChartFontManager,
    useChartInteractions,
    useChartLabelFormats,
    useChartLabelLayout,
    useChartLabelMeasurements,
    useDynamicYDomain,
    useLabelHitTesting,
} from '@components/Charts/hooks';
import {calculateMinDomainPadding, getBarInnerPadding, getXAxisLabel, getXAxisLabelData, getYAxisLabelWidth} from '@components/Charts/utils';
import VictoryTheme, {CHART_CONTENT_MIN_HEIGHT, GLYPH_PADDING} from '@components/Charts/VictoryTheme';

import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import type {LayoutChangeEvent} from 'react-native';
import type {CartesianChartRenderArg, ChartBounds, PointsArray, Scale} from 'victory-native';

import {DashPathEffect} from '@shopify/react-native-skia';
import React, {useState} from 'react';
import {View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';
import {Bar, CartesianChart} from 'victory-native';

import type {BarChartProps} from './types';

/** Extra pixel spacing between the chart boundary and the data range, applied per side (Victory's `domainPadding` prop)
 * We need bottom: 1 for proper display of the bottom label
 */
const BASE_DOMAIN_PADDING = {top: 32, bottom: 1, left: 0, right: 0};

function VerticalBarChartContentBody({data, isLoading, yAxisUnit, yAxisUnitPosition = 'left', xAxisLabelMode = 'all', color, onBarPress}: BarChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const fontManager = useChartFontManager();
    const [chartWidth, setChartWidth] = useState(0);
    const [barAreaWidth, setBarAreaWidth] = useState(0);
    const [boundsLeft, setBoundsLeft] = useState(0);
    const [boundsRight, setBoundsRight] = useState(0);

    const chartData = data.map((point, index) => ({
        x: index,
        y: point.total,
    }));

    const yAxisDomain = useDynamicYDomain(data);

    const handleBarPress = (index: number) => {
        if (index < 0 || index >= data.length) {
            return;
        }
        const dataPoint = data.at(index);
        if (dataPoint && onBarPress) {
            onBarPress(dataPoint, index);
        }
    };

    const handleLayout = (event: LayoutChangeEvent) => {
        setChartWidth(event.nativeEvent.layout.width);
    };

    const {formatValue, formatAxisValue} = useChartLabelFormats({
        data,
        unit: yAxisUnit,
        unitPosition: yAxisUnitPosition,
    });

    const yAxisLabelWidth = getYAxisLabelWidth(data, formatAxisValue, fontManager, variables.iconSizeExtraSmall, BASE_DOMAIN_PADDING);
    const chartPaddingLeft = yAxisLabelWidth + GLYPH_PADDING;

    // Bars fill the plot width and keep a fixed gap between them, so the padding ratio follows the width
    const barInnerPadding = getBarInnerPadding(chartWidth - chartPaddingLeft, data.length, BAR_GAP);

    const domainPadding = (() => {
        if (chartWidth === 0) {
            return BASE_DOMAIN_PADDING;
        }
        const horizontalPadding = calculateMinDomainPadding(chartWidth - chartPaddingLeft, data.length, barInnerPadding);
        return {...BASE_DOMAIN_PADDING, left: horizontalPadding, right: horizontalPadding};
    })();

    const totalDomainPadding = domainPadding.left + domainPadding.right;
    const paddingScale = barAreaWidth > 0 ? barAreaWidth / (barAreaWidth + totalDomainPadding) : 0;

    const shouldShowXAxisLabels = xAxisLabelMode !== 'none';
    const labelData = getXAxisLabelData(data, xAxisLabelMode);
    const originalLabels = labelData.map(getXAxisLabel);

    const measurements = useChartLabelMeasurements(labelData, fontManager, variables.iconSizeExtraSmall);

    const {labelRotation, labelSkipInterval, truncatedLabelWidths, xAxisLabelHeight, regularLabelMaxWidth, firstLabelMaxWidth, lastLabelMaxWidth, ellipsisWidth} = useChartLabelLayout({
        data: labelData,
        fontManager,
        fontSize: variables.iconSizeExtraSmall,
        tickSpacing: barAreaWidth > 0 ? barAreaWidth / data.length : 0,
        labelAreaWidth: barAreaWidth,
        firstTickLeftSpace: boundsLeft + domainPadding.left * paddingScale,
        lastTickRightSpace: chartWidth > 0 ? chartWidth - boundsRight + domainPadding.right * paddingScale : 0,
        measurements,
    });

    const barWidth = useSharedValue(0);
    const chartTop = useSharedValue(0);
    const chartBottom = useSharedValue(0);
    const yZero = useSharedValue(0);

    const {isCursorOverLabel, findLabelCursorX, updateTickPositions} = useLabelHitTesting({
        fontManager,
        fontSize: variables.iconSizeExtraSmall,
        truncatedLabelWidths,
        labelRotation,
        labelSkipInterval,
        chartBottom,
    });

    const handleChartBoundsChange = (bounds: ChartBounds) => {
        const domainWidth = bounds.right - bounds.left;
        const calculatedBarWidth = ((1 - barInnerPadding) * domainWidth) / data.length;
        barWidth.set(calculatedBarWidth);
        chartTop.set(bounds.top);
        yZero.set(0);
        setBarAreaWidth(domainWidth);
        setBoundsLeft(bounds.left);
        setBoundsRight(bounds.right);
    };

    // The target is the bar's full-height column, so a short bar is as easy to hover or tap as a tall one
    const checkIsOverBar = (args: HitTestArgs) => {
        'worklet';

        const currentBarWidth = barWidth.get();
        const currentYZero = yZero.get();
        if (currentBarWidth === 0) {
            return false;
        }
        const barLeft = args.targetX - currentBarWidth / 2;
        const barRight = args.targetX + currentBarWidth / 2;

        const columnTop = Math.min(chartTop.get(), args.targetY);
        const columnBottom = Math.max(args.targetY, currentYZero);

        return args.cursorX >= barLeft && args.cursorX <= barRight && args.cursorY >= columnTop && args.cursorY <= columnBottom;
    };

    const {customGestures, setPointPositions, matchedIndex, isTooltipActive, isCursorOverClickable, initialTooltipPosition} = useChartInteractions({
        handlePress: handleBarPress,
        checkIsOver: checkIsOverBar,
        isCursorOverLabel,
        resolveLabelTouchX: findLabelCursorX,
        chartBottom,
        yZero,
    });

    const handleScaleChange = (xScale: Scale, yScale: Scale) => {
        yZero.set(yScale(0));
        updateTickPositions(xScale, data.length);
        setPointPositions(
            chartData.map((point) => xScale(point.x)),
            chartData.map((point) => yScale(point.y)),
        );
    };

    const cursorStyle = useAnimatedStyle(() => ({
        cursor: isCursorOverClickable.get() ? 'pointer' : 'auto',
    }));

    const renderBar = (point: PointsArray[number], chartBounds: ChartBounds, barCount: number) => {
        const dataIndex = Number(point.xValue);
        const dataPoint = data.at(dataIndex);
        const barColor = color ?? VictoryTheme.colors.getColor(dataIndex);

        return (
            <Bar
                key={`bar-${dataPoint?.label}`}
                points={[point]}
                chartBounds={chartBounds}
                color={barColor}
                barCount={barCount}
                innerPadding={barInnerPadding}
                roundedCorners={{topLeft: BAR_CORNER_RADIUS, topRight: BAR_CORNER_RADIUS, bottomLeft: BAR_CORNER_RADIUS, bottomRight: BAR_CORNER_RADIUS}}
            />
        );
    };

    const renderOutside = (args: CartesianChartRenderArg<{x: number; y: number}, 'y'>) => {
        if (!fontManager || (shouldShowXAxisLabels && xAxisLabelHeight === undefined)) {
            return null;
        }

        const chartBoundsBottom = args.yScale(Math.min(...args.yTicks));
        chartBottom.set(chartBoundsBottom);

        return (
            <>
                {shouldShowXAxisLabels && (
                    <ChartXAxisLabels
                        labels={originalLabels}
                        labelWidths={measurements.labelWidths}
                        regularLabelMaxWidth={regularLabelMaxWidth}
                        firstLabelMaxWidth={firstLabelMaxWidth}
                        lastLabelMaxWidth={lastLabelMaxWidth}
                        ellipsisWidth={ellipsisWidth}
                        labelRotation={labelRotation}
                        labelSkipInterval={labelSkipInterval}
                        fontSize={variables.iconSizeExtraSmall}
                        fontManager={fontManager}
                        labelColor={theme.textSupporting}
                        xScale={args.xScale}
                        chartBoundsBottom={chartBoundsBottom}
                    />
                )}
                <ChartYAxisLabels
                    yTicks={args.yTicks}
                    yScale={args.yScale}
                    chartBounds={args.chartBounds}
                    fontSize={variables.iconSizeExtraSmall}
                    fontManager={fontManager}
                    labelColor={theme.icon}
                    formatValue={formatAxisValue}
                />
            </>
        );
    };

    const labelSpace = shouldShowXAxisLabels ? VictoryTheme.axis.labelGap + (xAxisLabelHeight ?? 0) : 0;
    const dynamicChartStyle = {height: CHART_CONTENT_MIN_HEIGHT + labelSpace};
    const chartPadding = {...VictoryTheme.axis.padding, bottom: labelSpace + VictoryTheme.axis.padding.bottom, left: chartPaddingLeft};

    if (isLoading || !fontManager) {
        return (
            <View style={styles.chartActivityIndicator}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (data.length === 0) {
        return null;
    }

    return (
        <GestureDetector
            gesture={customGestures}
            touchAction="pan-y"
        >
            <Animated.View
                style={[styles.chartContent, dynamicChartStyle, cursorStyle]}
                onLayout={handleLayout}
            >
                {chartWidth > 0 && (
                    <CartesianChart
                        xKey="x"
                        padding={chartPadding}
                        yKeys={['y']}
                        domainPadding={domainPadding}
                        onChartBoundsChange={handleChartBoundsChange}
                        onScaleChange={handleScaleChange}
                        renderOutside={renderOutside}
                        xAxis={{
                            tickCount: data.length,
                            lineWidth: VictoryTheme.axis.xLineWidth,
                        }}
                        yAxis={[
                            {
                                tickCount: VictoryTheme.axis.tickCount,
                                lineWidth: VictoryTheme.axis.yLineWidth,
                                lineColor: theme.border,
                                linePathEffect: <DashPathEffect intervals={[...VictoryTheme.axis.gridDashIntervals]} />,
                                labelOffset: VictoryTheme.axis.labelGap,
                                domain: yAxisDomain,
                            },
                        ]}
                        frame={{lineWidth: 0}}
                        data={chartData}
                    >
                        {({points, chartBounds}) => points.y.map((point) => renderBar(point, chartBounds, points.y.length))}
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

export default VerticalBarChartContentBody;

import type {CartesianChartProps, ChartDataPoint} from '..';

type BarChartProps = CartesianChartProps & {
    onBarPress?: (dataPoint: ChartDataPoint, index: number) => void;

    /** Whether each bar's label is drawn below it. Turn off when something outside the chart already names the bars. */
    shouldShowLabels?: boolean;

    /** Draws every bar in this one color instead of giving each bar its own palette color. */
    color?: string;

    /** Whether a bar whose period hasn't ended yet is drawn as a dashed outline instead of a filled bar. */
    shouldMarkInProgressBar?: boolean;
};

export default BarChartProps;

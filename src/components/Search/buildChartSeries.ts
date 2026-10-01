import type {ChartDataPoint} from '@components/Charts';
import VictoryTheme from '@components/Charts/VictoryTheme';

import {convertToFrontendAmountAsInteger} from '@libs/CurrencyUtils';
import {isShareWorthDrawing} from '@libs/PercentageUtils';
import StringUtils from '@libs/StringUtils';

import CONST from '@src/CONST';

import type {ChartView, GroupedItem, SearchChartDataRow, SearchChartMetric} from './types';

type BuildChartSeriesParams = {
    /** Grouped search results, in the order the search returned them */
    data: GroupedItem[];

    /** The chart type the rows are plotted on, which decides how groups are colored */
    view: ChartView;

    /** Returns the full label of a group */
    getLabel: (item: GroupedItem) => string;

    /** Returns the compact axis label of a group, or undefined to fall back to the full label */
    getShortLabel?: (item: GroupedItem) => string | undefined;

    /** Returns how many decimals a currency is displayed with */
    getCurrencyDecimals: (currency: string) => number;

    /** What each group is plotted by. Defaults to the group's amount. */
    metric?: SearchChartMetric;

    /** Color every bar is drawn in. Left out, each bar takes a different color from the palette. */
    color?: string;
};

/** Pie colors follow the slice ranking rather than the array order. Groups the donut leaves out get no color. */
function getSliceColorsByDataIndex(data: ChartDataPoint[]): Array<string | undefined> {
    const colors: Array<string | undefined> = Array.from({length: data.length});

    const ranked = data
        .map((point, index) => ({absTotal: Math.abs(point.total), percentOfTotal: point.percentOfTotal, index}))
        .filter((entry) => isShareWorthDrawing(entry.percentOfTotal))
        .sort((a, b) => b.absTotal - a.absTotal);

    for (const [rank, entry] of ranked.entries()) {
        colors[entry.index] = VictoryTheme.colors.getColor(rank);
    }

    return colors;
}

/** Reads the value a group is plotted by. Counts are plotted as they are, amounts are scaled down from the currency's minor units. */
function getChartMetricValue(item: GroupedItem, metric: SearchChartMetric, getCurrencyDecimals: (currency: string) => number): number {
    if (metric === CONST.SEARCH.CHART_METRIC.COUNT) {
        return item.count ?? 0;
    }

    return convertToFrontendAmountAsInteger(item.total ?? 0, getCurrencyDecimals(item.currency ?? CONST.CURRENCY.USD));
}

/** This is the single place group totals are turned into plotted values. */
function buildChartSeries({
    data,
    view,
    getLabel,
    getShortLabel,
    getCurrencyDecimals,
    metric = CONST.SEARCH.CHART_METRIC.AMOUNT,
    color: barColor,
}: BuildChartSeriesParams): SearchChartDataRow[] {
    const rows = data.map((item) => {
        const point: ChartDataPoint = {
            label: StringUtils.normalize(getLabel(item)),
            shortLabel: getShortLabel?.(item),
            total: getChartMetricValue(item, metric, getCurrencyDecimals),

            // The search only reports each group's share of the total amount, which a count doesn't follow
            percentOfTotal: metric === CONST.SEARCH.CHART_METRIC.COUNT ? undefined : item.percentOfTotal,
        };

        return {point, item};
    });

    const pieColors = view === CONST.SEARCH.VIEW.PIE ? getSliceColorsByDataIndex(rows.map((row) => row.point)) : undefined;

    return rows.map((row, index) => {
        let color;
        if (pieColors) {
            color = pieColors.at(index);
        } else if (view === CONST.SEARCH.VIEW.BAR) {
            color = barColor ?? VictoryTheme.colors.getColor(index);
        }

        return {...row, color};
    });
}

export {buildChartSeries, getChartMetricValue, getSliceColorsByDataIndex};

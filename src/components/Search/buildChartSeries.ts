import type {ChartDataPoint} from '@components/Charts';
import VictoryTheme from '@components/Charts/VictoryTheme';

import {convertToFrontendAmountAsInteger} from '@libs/CurrencyUtils';
import {isShareWorthDrawing} from '@libs/PercentageUtils';
import StringUtils from '@libs/StringUtils';

import CONST from '@src/CONST';

import type {ChartView, GroupedItem, SearchChartDataRow} from './types';

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

    /** Returns the label of a group whose period hasn't ended yet, or undefined for a finished one */
    getInProgressLabel?: (item: GroupedItem) => string | undefined;

    /** Whether each point plots the total of every group up to and including its own, in the order the groups are given */
    isRunningTotal?: boolean;
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

/** This is the single place group totals are turned into plotted values. */
/** Turns each point's own total into the total so far. Credits lower the line, nothing is clamped. Each row keeps its own group, so pressing a point still opens that period's expenses. */
function accumulateRunningTotals(rows: SearchChartDataRow[]): SearchChartDataRow[] {
    const rangeTotal = rows.reduce((sum, row) => sum + row.point.total, 0);
    let runningTotal = 0;

    return rows.map((row) => {
        runningTotal += row.point.total;
        return {
            ...row,
            point: {
                ...row.point,
                total: runningTotal,
                percentOfTotal: rangeTotal === 0 ? undefined : (runningTotal / rangeTotal) * 100,
            },
        };
    });
}

function buildChartSeries({data, view, getLabel, getShortLabel, getCurrencyDecimals, getInProgressLabel, isRunningTotal = false}: BuildChartSeriesParams): SearchChartDataRow[] {
    const ownTotalRows = data.map((item) => {
        const decimals = getCurrencyDecimals(item.currency ?? CONST.CURRENCY.USD);
        const label = StringUtils.normalize(getLabel(item));
        const shortLabel = getShortLabel?.(item);
        const inProgressLabel = getInProgressLabel?.(item);
        const point: ChartDataPoint = {
            label,
            shortLabel,
            total: convertToFrontendAmountAsInteger(item.total ?? 0, decimals),
            percentOfTotal: item.percentOfTotal,
        };
        if (inProgressLabel !== undefined) {
            point.label = inProgressLabel;
            point.shortLabel = shortLabel ?? label;
            point.isInProgress = true;
        }

        return {point, item};
    });
    const rows = isRunningTotal ? accumulateRunningTotals(ownTotalRows) : ownTotalRows;

    const pieColors = view === CONST.SEARCH.VIEW.PIE ? getSliceColorsByDataIndex(rows.map((row) => row.point)) : undefined;

    return rows.map((row, index) => {
        let color;
        if (pieColors) {
            color = pieColors.at(index);
        } else if (view === CONST.SEARCH.VIEW.BAR) {
            color = VictoryTheme.colors.getColor(index);
        }

        return {...row, color};
    });
}

export {buildChartSeries, getSliceColorsByDataIndex};

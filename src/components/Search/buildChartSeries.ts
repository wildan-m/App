import type {ChartDataPoint, ChartSeries} from '@components/Charts';
import {getSeriesValue} from '@components/Charts/utils';
import VictoryTheme from '@components/Charts/VictoryTheme';

import {convertToFrontendAmountAsInteger} from '@libs/CurrencyUtils';
import {isShareWorthDrawing} from '@libs/PercentageUtils';
import StringUtils from '@libs/StringUtils';

import CONST from '@src/CONST';

import {differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarQuarters, differenceInCalendarYears, parseISO} from 'date-fns';

import type {ChartBucketUnit} from './chartGroupByConfig';
import type {ChartView, GroupedItem, SearchChartDataRow, SearchGroupBy} from './types';

import CHART_GROUP_BY_CONFIG from './chartGroupByConfig';

const CHART_SERIES_KEY = {
    PRIMARY: 'primary',
    COMPARISON: 'comparison',
} as const;

const DAYS_IN_WEEK = 7;

/** Bucket offset from the period start. Weeks count from the week holding the first day, whatever weekday weeks start on. */
const BUCKET_OFFSET: Record<ChartBucketUnit, (bucketStart: Date, periodStart: Date) => number> = {
    day: differenceInCalendarDays,
    week: (bucketStart, periodStart) => Math.ceil(differenceInCalendarDays(bucketStart, periodStart) / DAYS_IN_WEEK),
    month: differenceInCalendarMonths,
    quarter: differenceInCalendarQuarters,
    year: differenceInCalendarYears,
};

/** A compared period's dates and series color */
type ChartComparisonPeriod = {
    /** The period's dates, as yyyy-MM-dd strings. Bucket offsets are measured from its start. */
    range: {start: string; end: string};

    /** Color the period's series is drawn with */
    color?: string;
};

/** A second dataset, paired with the primary one */
type ChartComparison = {
    /** Grouped rows of the comparison period */
    rows: GroupedItem[];

    primaryPeriod: ChartComparisonPeriod;

    comparisonPeriod: ChartComparisonPeriod;
};

type BuildChartSeriesParams = {
    /** Grouped search results drawn as the primary series, in the order the search returned them */
    rows: GroupedItem[];

    /** Second dataset, when comparing periods */
    comparison?: ChartComparison;

    /** The chart type the rows are plotted on, which decides how groups are colored */
    view: ChartView;

    /** Decides how rows of the two periods pair up */
    groupBy: SearchGroupBy;

    /** Returns the full label of a group */
    getLabel: (item: GroupedItem) => string;

    /** Returns the compact axis label of a group, or undefined to fall back to the full label */
    getShortLabel?: (item: GroupedItem) => string | undefined;

    /** Returns how many decimals a currency is displayed with */
    getCurrencyDecimals: (currency: string) => number;

    /** Returns the label of a group whose period hasn't ended yet, or undefined for a finished one */
    getInProgressLabel?: (item: GroupedItem) => string | undefined;
};

type SearchChartModel = {
    /** Metadata for each plotted series, primary first */
    series: ChartSeries[];

    /** One row per plotted group, holding the point the chart draws and the search rows its values came from */
    rows: SearchChartDataRow[];
};

/** Pie colors follow the slice ranking rather than the array order. Groups the donut leaves out get no color. */
function getSliceColorsByDataIndex(data: ChartDataPoint[]): Array<string | undefined> {
    const colors: Array<string | undefined> = Array.from({length: data.length});

    const ranked = data
        .map((point, index) => ({absTotal: Math.abs(getSeriesValue(point, CHART_SERIES_KEY.PRIMARY)), percentOfTotal: point.percentOfTotal, index}))
        .filter((entry) => isShareWorthDrawing(entry.percentOfTotal))
        .sort((a, b) => b.absTotal - a.absTotal);

    for (const [rank, entry] of ranked.entries()) {
        colors[entry.index] = VictoryTheme.colors.getColor(rank);
    }

    return colors;
}

/**
 * The key a row shares with its counterpart in the other period.
 *
 * Ranking rows key on the group's own identity, which their filter query already carries, rather than on a label
 * that can be localized or repeated. Time buckets key on their offset from their own period's start, so the 3rd
 * month of the current period pairs with the 3rd month of the previous one, also when one side has no expenses
 * in a bucket (a search returns only the buckets that hold expenses).
 */
function getPairingKey(item: GroupedItem, groupBy: SearchGroupBy, periodStart: string): string {
    const {bucketUnit, getDateRange, getFilterQuery} = CHART_GROUP_BY_CONFIG[groupBy];
    const bucketStart = bucketUnit && getDateRange ? getDateRange(item)?.start : undefined;

    if (bucketUnit && bucketStart) {
        return `bucket:${BUCKET_OFFSET[bucketUnit](parseISO(bucketStart), parseISO(periodStart))}`;
    }

    return getFilterQuery(item);
}

/** This is the single place group totals are turned into plotted values. */
function buildChartSeries({rows: data, comparison, view, groupBy, getLabel, getShortLabel, getCurrencyDecimals, getInProgressLabel}: BuildChartSeriesParams): SearchChartModel {
    const getAmount = (item: GroupedItem) => convertToFrontendAmountAsInteger(item.total ?? 0, getCurrencyDecimals(item.currency ?? CONST.CURRENCY.USD));

    const rows: SearchChartDataRow[] = data.map((item) => {
        const label = StringUtils.normalize(getLabel(item));
        const shortLabel = getShortLabel?.(item);
        const inProgressLabel = getInProgressLabel?.(item);
        const point: ChartDataPoint = {
            label,
            shortLabel,
            values: {[CHART_SERIES_KEY.PRIMARY]: getAmount(item)},
            percentOfTotal: item.percentOfTotal,
            count: item.count,
        };
        if (inProgressLabel !== undefined) {
            point.label = inProgressLabel;
            point.shortLabel = shortLabel ?? label;
            point.isInProgress = true;
        }

        return {point, item};
    });

    const series: ChartSeries[] = [{key: CHART_SERIES_KEY.PRIMARY, color: comparison?.primaryPeriod.color}];

    if (comparison) {
        series.push({key: CHART_SERIES_KEY.COMPARISON, color: comparison.comparisonPeriod.color});

        // Comparison rows not paired below are buckets or groups only the comparison period covers.
        const unpairedByKey = new Map(comparison.rows.map((item) => [getPairingKey(item, groupBy, comparison.comparisonPeriod.range.start), item]));

        for (const row of rows) {
            const key = getPairingKey(row.item, groupBy, comparison.primaryPeriod.range.start);
            const counterpart = unpairedByKey.get(key);
            if (!counterpart) {
                continue;
            }
            unpairedByKey.delete(key);
            row.comparisonItem = counterpart;
            row.point.values[CHART_SERIES_KEY.COMPARISON] = getAmount(counterpart);
            row.point.seriesLabels = {
                [CHART_SERIES_KEY.PRIMARY]: StringUtils.normalize(getLabel(row.item)),
                [CHART_SERIES_KEY.COMPARISON]: StringUtils.normalize(getLabel(counterpart)),
            };
        }

        // A group only the comparison period covers is still plotted, labeled by its own row since the primary period has nothing to name it by.
        for (const item of unpairedByKey.values()) {
            const label = StringUtils.normalize(getLabel(item));
            rows.push({
                point: {
                    label,
                    shortLabel: getShortLabel?.(item),
                    values: {[CHART_SERIES_KEY.COMPARISON]: getAmount(item)},
                    seriesLabels: {[CHART_SERIES_KEY.COMPARISON]: label},
                },
                item,
            });
        }

        // Compared time buckets are drawn in chronological position, measured within each row's own period.
        const {bucketUnit, getDateRange} = CHART_GROUP_BY_CONFIG[groupBy];
        if (bucketUnit && getDateRange) {
            const getOffset = (row: SearchChartDataRow) => {
                const periodStart = row.point.values[CHART_SERIES_KEY.PRIMARY] === undefined ? comparison.comparisonPeriod.range.start : comparison.primaryPeriod.range.start;
                const bucketStart = getDateRange(row.item)?.start;
                return bucketStart ? BUCKET_OFFSET[bucketUnit](parseISO(bucketStart), parseISO(periodStart)) : 0;
            };
            rows.sort((a, b) => getOffset(a) - getOffset(b));
        }
    }

    const pieColors = view === CONST.SEARCH.VIEW.PIE ? getSliceColorsByDataIndex(rows.map((row) => row.point)) : undefined;

    return {
        series,
        rows: rows.map((row, index) => {
            let color;
            if (pieColors) {
                color = pieColors.at(index);
            } else if (view === CONST.SEARCH.VIEW.BAR) {
                color = VictoryTheme.colors.getColor(index);
            }

            return {...row, color};
        }),
    };
}

export {buildChartSeries, getSliceColorsByDataIndex, CHART_SERIES_KEY};
export type {ChartComparison, ChartComparisonPeriod, SearchChartModel};

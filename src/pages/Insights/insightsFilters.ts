import type {SearchCompareMode, SearchDatePreset} from '@components/Search/types';

import {getDateRangeForPreset} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';

import {differenceInCalendarDays, parseISO} from 'date-fns';

type InsightsFilters = {
    /** Period reported on: one of the presets, a single day, or a range closed at both ends. */
    date: {preset: SearchDatePreset} | {on: string} | {from: string; to: string};

    /** Workspaces to report on, or every workspace the user can see when empty. */
    policyIDs: string[];

    /** Time bucket the headline chart aggregates into. */
    groupBy:
        | typeof CONST.SEARCH.GROUP_BY.DAY
        | typeof CONST.SEARCH.GROUP_BY.WEEK
        | typeof CONST.SEARCH.GROUP_BY.MONTH
        | typeof CONST.SEARCH.GROUP_BY.QUARTER
        | typeof CONST.SEARCH.GROUP_BY.YEAR;

    /** Currency every amount is converted to, so graphs can sum across workspaces. */
    groupCurrency: string;

    /** What the period on screen is drawn against, or nothing when the charts show it alone. */
    compare?: SearchCompareMode;

    /** Whether the headline chart plots the spend so far at each point instead of each period's own total. */
    isRunningTotal?: boolean;
};

const DEFAULT_INSIGHTS_FILTERS: Omit<InsightsFilters, 'groupCurrency'> = {
    date: {preset: CONST.SEARCH.DATE_PRESETS.YEAR_TO_DATE},
    policyIDs: [],
    groupBy: CONST.SEARCH.GROUP_BY.MONTH,
};

const INSIGHTS_GROUP_BY_OPTIONS = [CONST.SEARCH.GROUP_BY.DAY, CONST.SEARCH.GROUP_BY.WEEK, CONST.SEARCH.GROUP_BY.MONTH, CONST.SEARCH.GROUP_BY.QUARTER, CONST.SEARCH.GROUP_BY.YEAR] as const;

/** Longest Date range, in days, a running total is plotted by day. Longer ranges are plotted by month. */
const RUNNING_TOTAL_MAX_DAILY_RANGE_DAYS = 62;

/** Returns the dates a Date filter covers, as yyyy-MM-dd strings, or empty strings when it has no fixed bounds. */
function getInsightsDateBounds(date: InsightsFilters['date']): {start: string; end: string} {
    if ('preset' in date) {
        return getDateRangeForPreset(date.preset);
    }
    if ('on' in date) {
        return {start: date.on, end: date.on};
    }
    return {start: date.from, end: date.to};
}

/** Returns the time bucket the headline chart aggregates into. A running total picks its own: by day for short Date ranges, by month otherwise. */
function getInsightsTimeGroupBy({date, groupBy, isRunningTotal}: Pick<InsightsFilters, 'date' | 'groupBy' | 'isRunningTotal'>): InsightsFilters['groupBy'] {
    if (!isRunningTotal) {
        return groupBy;
    }

    const {start, end} = getInsightsDateBounds(date);
    if (!start || !end) {
        return CONST.SEARCH.GROUP_BY.MONTH;
    }

    const rangeDays = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
    return rangeDays <= RUNNING_TOTAL_MAX_DAILY_RANGE_DAYS ? CONST.SEARCH.GROUP_BY.DAY : CONST.SEARCH.GROUP_BY.MONTH;
}

export type {InsightsFilters};
export {INSIGHTS_GROUP_BY_OPTIONS, getInsightsTimeGroupBy};
export default DEFAULT_INSIGHTS_FILTERS;

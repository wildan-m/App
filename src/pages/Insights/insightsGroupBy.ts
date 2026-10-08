import {getDateRangeForPreset} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';

import {addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, isValid, parseISO} from 'date-fns';

import type {InsightsFilters} from './insightsFilters';

import {INSIGHTS_GROUP_BY_OPTIONS} from './insightsFilters';

type InsightsGroupBy = InsightsFilters['groupBy'];

/** Longest range, in days, still readable when grouped by day */
const MAX_DAYS_GROUPED_BY_DAY = 62;

/** Resolves a preset or a range to the first and last day it covers, or nothing when it has no fixed span. */
function getDateBounds(date: Exclude<InsightsFilters['date'], {on: string}>): {start: Date; end: Date} | undefined {
    const {start, end} = 'preset' in date ? getDateRangeForPreset(date.preset) : {start: date.from, end: date.to};
    if (!start || !end) {
        return undefined;
    }

    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (!isValid(startDate) || !isValid(endDate) || endDate < startDate) {
        return undefined;
    }

    return {start: startDate, end: endDate};
}

/**
 * Time buckets that fit the date filter, in the menu's order. A bucket needs a range of at least two of its periods so there's a trend to read,
 * and grouping by day stops once the points get too many to read. A single day has nothing to group, so it gets no options.
 */
function getInsightsGroupByOptions(date: InsightsFilters['date']): InsightsGroupBy[] {
    if ('on' in date) {
        return [];
    }

    const bounds = getDateBounds(date);
    if (!bounds) {
        return [...INSIGHTS_GROUP_BY_OPTIONS];
    }

    // The day after the range ends, so a range made of whole periods counts every one of them
    const {start} = bounds;
    const end = addDays(bounds.end, 1);
    const doesFit: Record<InsightsGroupBy, boolean> = {
        [CONST.SEARCH.GROUP_BY.DAY]: differenceInCalendarDays(end, start) <= MAX_DAYS_GROUPED_BY_DAY,
        [CONST.SEARCH.GROUP_BY.WEEK]: addWeeks(start, 2) <= end,
        [CONST.SEARCH.GROUP_BY.MONTH]: addMonths(start, 2) <= end,
        [CONST.SEARCH.GROUP_BY.QUARTER]: addMonths(start, 6) <= end,
        [CONST.SEARCH.GROUP_BY.YEAR]: addYears(start, 2) <= end,
    };

    return INSIGHTS_GROUP_BY_OPTIONS.filter((option) => doesFit[option]);
}

/** Picks the bucket closest to the given one in the menu's order, keeping it when it's among the options. */
function getNearestInsightsGroupBy(options: InsightsGroupBy[], groupBy: InsightsGroupBy): InsightsGroupBy {
    const targetIndex = INSIGHTS_GROUP_BY_OPTIONS.indexOf(groupBy);
    const getDistance = (option: InsightsGroupBy) => Math.abs(INSIGHTS_GROUP_BY_OPTIONS.indexOf(option) - targetIndex);

    return options.reduce((nearest, option) => (getDistance(option) < getDistance(nearest) ? option : nearest), options.at(0) ?? groupBy);
}

/** Moves a saved bucket the date filter rules out to the nearest one it allows. A single day leaves it alone, since there's nothing to pick from. */
function getInsightsGroupByForDate(date: InsightsFilters['date'], groupBy: InsightsGroupBy): InsightsGroupBy {
    const options = getInsightsGroupByOptions(date);
    if (options.length === 0) {
        return groupBy;
    }

    return getNearestInsightsGroupBy(options, groupBy);
}

export {getInsightsGroupByForDate, getInsightsGroupByOptions, getNearestInsightsGroupBy};

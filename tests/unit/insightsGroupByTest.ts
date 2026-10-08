import type {InsightsFilters} from '@pages/Insights/insightsFilters';
import {getInsightsGroupByForDate, getInsightsGroupByOptions} from '@pages/Insights/insightsGroupBy';

import CONST from '@src/CONST';

const {DAY, WEEK, MONTH, QUARTER, YEAR} = CONST.SEARCH.GROUP_BY;
const {THIS_MONTH, LAST_MONTH, YEAR_TO_DATE, LAST_12_MONTHS} = CONST.SEARCH.DATE_PRESETS;

function preset(datePreset: (typeof CONST.SEARCH.DATE_PRESETS)[keyof typeof CONST.SEARCH.DATE_PRESETS]): InsightsFilters['date'] {
    return {preset: datePreset};
}

describe('insightsGroupBy', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getInsightsGroupByOptions', () => {
        it('offers only the buckets that fit each date preset in October', () => {
            // Given today is in October, so the year to date spans more than nine months
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2026, 9, 8));

            // When the options are read for each preset
            // Then a month offers days and weeks, while the longer ranges drop days and only Last 12 months leaves out years
            expect(getInsightsGroupByOptions(preset(THIS_MONTH))).toEqual([DAY, WEEK]);
            expect(getInsightsGroupByOptions(preset(LAST_MONTH))).toEqual([DAY, WEEK]);
            expect(getInsightsGroupByOptions(preset(YEAR_TO_DATE))).toEqual([WEEK, MONTH, QUARTER]);
            expect(getInsightsGroupByOptions(preset(LAST_12_MONTHS))).toEqual([WEEK, MONTH, QUARTER]);
        });

        it('offers days and weeks for the year to date at the end of January', () => {
            // Given today is the last day of January, so the year to date is a single month
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2026, 0, 31));

            // When the options are read for the year to date
            // Then it offers the same buckets as a single month
            expect(getInsightsGroupByOptions(preset(YEAR_TO_DATE))).toEqual([DAY, WEEK]);
        });

        it('sizes a custom range by its length, counting both of its ends', () => {
            // Given ranges right at each bucket's limit
            // When the options are read for each range
            // Then 14 days is the first to allow weeks, 62 days the last to allow days, and two whole years the first to allow years
            expect(getInsightsGroupByOptions({from: '2026-03-01', to: '2026-03-13'})).toEqual([DAY]);
            expect(getInsightsGroupByOptions({from: '2026-03-01', to: '2026-03-14'})).toEqual([DAY, WEEK]);
            expect(getInsightsGroupByOptions({from: '2026-03-01', to: '2026-05-01'})).toEqual([DAY, WEEK, MONTH]);
            expect(getInsightsGroupByOptions({from: '2026-03-01', to: '2026-05-02'})).toEqual([WEEK, MONTH]);
            expect(getInsightsGroupByOptions({from: '2024-01-01', to: '2025-12-31'})).toEqual([WEEK, MONTH, QUARTER, YEAR]);
        });

        it('offers nothing for a single day', () => {
            // Given a custom date of a single day, which plots one point
            // When the options are read for it
            // Then there is nothing to group by, so the control can be left out
            expect(getInsightsGroupByOptions({on: '2026-10-01'})).toEqual([]);
        });
    });

    describe('getInsightsGroupByForDate', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2026, 9, 8));
        });

        it('moves a saved bucket the range rules out to the nearest one it allows', () => {
            // Given a dashboard saved grouped by quarter
            // When the date changes to this month, which only allows days and weeks
            // Then it lands on weeks, the closest of the two to quarters
            expect(getInsightsGroupByForDate(preset(THIS_MONTH), QUARTER)).toBe(WEEK);

            // And when a dashboard saved grouped by day moves to the last 12 months, it lands on weeks
            expect(getInsightsGroupByForDate(preset(LAST_12_MONTHS), DAY)).toBe(WEEK);
        });

        it('keeps a saved bucket the range still allows', () => {
            // Given a dashboard saved grouped by week
            // When the date changes to the last 12 months, which still allows weeks
            // Then it stays on weeks rather than returning to an earlier choice
            expect(getInsightsGroupByForDate(preset(LAST_12_MONTHS), WEEK)).toBe(WEEK);
        });

        it('leaves the saved bucket alone for a single day', () => {
            // Given a dashboard saved grouped by quarter
            // When the date changes to a single day, which has no buckets to pick from
            // Then the saved bucket is kept for when a range is picked again
            expect(getInsightsGroupByForDate({on: '2026-10-01'}, QUARTER)).toBe(QUARTER);
        });
    });
});

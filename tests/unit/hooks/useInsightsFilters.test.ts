import {act, renderHook, waitFor} from '@testing-library/react-native';

import INSIGHTS_DASHBOARD_SPECS from '@pages/Insights/dashboardSpecs';
import type {InsightsFilters} from '@pages/Insights/insightsFilters';
import {buildInsightsQueryString} from '@pages/Insights/insightsQueries';
import useInsightsFilters from '@pages/Insights/useInsightsFilters';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import createRandomPolicy from '../../utils/collections/policies';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

const POLICY_ID = '1';
const SPEND_SEARCH_KEY = INSIGHTS_DASHBOARD_SPECS[CONST.INSIGHTS.DASHBOARD.SPEND].searchKey;

/** Makes the user's default workspace, which is where the default group currency comes from. */
async function setUpActivePolicy(outputCurrency: string) {
    const policy: Policy = {...createRandomPolicy(Number(POLICY_ID), CONST.POLICY.TYPE.TEAM), outputCurrency};
    await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${POLICY_ID}`, policy);
    await Onyx.merge(ONYXKEYS.NVP_ACTIVE_POLICY_ID, POLICY_ID);
    await waitForBatchedUpdates();
}

/** Reads back what the dashboard's selections were stored as. */
async function getStoredQuery(): Promise<string | undefined> {
    const searchFilters = await new Promise<Record<string, unknown> | undefined>((resolve) => {
        const connection = Onyx.connectWithoutView({
            key: ONYXKEYS.SEARCH_FILTERS,
            callback: (value) => {
                Onyx.disconnect(connection);
                resolve(value as Record<string, unknown> | undefined);
            },
        });
    });

    const searchFilter = searchFilters?.[SPEND_SEARCH_KEY];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return typeof searchFilter === 'object' ? (searchFilter as {query: string}).query : undefined;
}

describe('useInsightsFilters', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});

        // Pins today to October, so the year to date is long enough to group by month. Only the clock is faked, so Onyx and waitFor keep running.
        jest.useFakeTimers({
            now: new Date(2026, 9, 8),
            doNotFake: [
                'nextTick',
                'setImmediate',
                'clearImmediate',
                'setTimeout',
                'clearTimeout',
                'setInterval',
                'clearInterval',
                'queueMicrotask',
                'requestAnimationFrame',
                'cancelAnimationFrame',
                'requestIdleCallback',
                'cancelIdleCallback',
                'hrtime',
                'performance',
            ],
        });
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('opens on the page defaults, in the default workspace currency', async () => {
        // Given a user whose default workspace reports in PLN, and no stored selections
        await setUpActivePolicy('PLN');

        // When the dashboard resolves its filters
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        // Then it reports on the year to date, across every workspace, in that currency
        expect(result.current.filters).toEqual({
            date: {preset: CONST.SEARCH.DATE_PRESETS.YEAR_TO_DATE},
            policyIDs: [],
            groupBy: CONST.SEARCH.GROUP_BY.MONTH,
            groupCurrency: 'PLN',
        });
    });

    it('opens on the stored selections where the user has made one', async () => {
        // Given a dashboard last left on a single workspace, grouped by week, in USD
        await setUpActivePolicy('PLN');
        const stored: InsightsFilters = {
            date: {preset: CONST.SEARCH.DATE_PRESETS.LAST_MONTH},
            policyIDs: ['A1'],
            groupBy: CONST.SEARCH.GROUP_BY.WEEK,
            groupCurrency: 'USD',
        };
        await Onyx.merge(ONYXKEYS.SEARCH_FILTERS, {[SPEND_SEARCH_KEY]: {query: buildInsightsQueryString(stored)}});
        await waitForBatchedUpdates();

        // When the dashboard resolves its filters
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        // Then what was stored wins over the page defaults and the default workspace currency
        expect(result.current.filters).toEqual(stored);
    });

    it('keeps reporting the page defaults once a selection is stored, so a control can reset to them', async () => {
        // Given a dashboard stored in USD for a user whose default workspace reports in PLN
        await setUpActivePolicy('PLN');
        await Onyx.merge(ONYXKEYS.SEARCH_FILTERS, {
            [SPEND_SEARCH_KEY]: {
                query: buildInsightsQueryString({date: {preset: CONST.SEARCH.DATE_PRESETS.LAST_MONTH}, policyIDs: ['A1'], groupBy: CONST.SEARCH.GROUP_BY.QUARTER, groupCurrency: 'USD'}),
            },
        });
        await waitForBatchedUpdates();

        // When the dashboard resolves its filters
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        // Then the defaults ignore the stored selections, keeping the default workspace currency for Group currency's Reset
        expect(result.current.defaultFilters).toEqual({
            date: {preset: CONST.SEARCH.DATE_PRESETS.YEAR_TO_DATE},
            policyIDs: [],
            groupBy: CONST.SEARCH.GROUP_BY.MONTH,
            groupCurrency: 'PLN',
        });
    });

    it('waits for the stored selections before saying it has resolved', async () => {
        // Given Onyx with nothing loaded yet
        // When the dashboard first asks for its filters
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));

        // Then it reports as unresolved, so the page doesn't request a dashboard the user never asked for
        expect(result.current.isResolved).toBe(false);
    });

    it('stores a control’s selection alongside the rest of the dashboard’s filters', async () => {
        // Given a dashboard reporting on one workspace
        await setUpActivePolicy('PLN');
        await Onyx.merge(ONYXKEYS.SEARCH_FILTERS, {
            [SPEND_SEARCH_KEY]: {
                query: buildInsightsQueryString({date: {preset: CONST.SEARCH.DATE_PRESETS.LAST_12_MONTHS}, policyIDs: ['A1'], groupBy: CONST.SEARCH.GROUP_BY.MONTH, groupCurrency: 'USD'}),
            },
        });
        await waitForBatchedUpdates();
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        // When only the time bucket is changed
        await act(async () => {
            result.current.setFilters({groupBy: CONST.SEARCH.GROUP_BY.QUARTER});
            await waitForBatchedUpdates();
        });

        // Then the stored query carries the new bucket and everything the other controls had already narrowed
        expect(await getStoredQuery()).toBe('groupBy:quarter groupCurrency:USD policyID:A1 date:last-12-months');
    });

    it('moves a stored bucket the date range rules out to the nearest one, on opening and when the date changes', async () => {
        // Given a dashboard saved grouped by quarter over the last 12 months
        await setUpActivePolicy('PLN');
        await Onyx.merge(ONYXKEYS.SEARCH_FILTERS, {
            [SPEND_SEARCH_KEY]: {
                query: buildInsightsQueryString({date: {preset: CONST.SEARCH.DATE_PRESETS.LAST_12_MONTHS}, policyIDs: [], groupBy: CONST.SEARCH.GROUP_BY.QUARTER, groupCurrency: 'USD'}),
            },
        });
        await waitForBatchedUpdates();
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));
        expect(result.current.filters.groupBy).toBe(CONST.SEARCH.GROUP_BY.QUARTER);

        // When the date changes to this month, which only allows days and weeks
        await act(async () => {
            result.current.setFilters({date: {preset: CONST.SEARCH.DATE_PRESETS.THIS_MONTH}});
            await waitForBatchedUpdates();
        });

        // Then weeks, the closest bucket to quarters, is what's shown and saved
        expect(result.current.filters.groupBy).toBe(CONST.SEARCH.GROUP_BY.WEEK);
        expect(await getStoredQuery()).toBe('groupBy:week groupCurrency:USD date:this-month');
    });

    it('opens a stored bucket the date range rules out on the nearest one, so Home shows the same grouping', async () => {
        // Given a dashboard stored grouped by quarter over this month, from before the options followed the date range
        await setUpActivePolicy('PLN');
        await Onyx.merge(ONYXKEYS.SEARCH_FILTERS, {
            [SPEND_SEARCH_KEY]: {
                query: buildInsightsQueryString({date: {preset: CONST.SEARCH.DATE_PRESETS.THIS_MONTH}, policyIDs: [], groupBy: CONST.SEARCH.GROUP_BY.QUARTER, groupCurrency: 'USD'}),
            },
        });
        await waitForBatchedUpdates();

        // When the filters resolve, as they do for both the Insights page and Home's widget
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        // Then the grouping in use is weeks, one the Group by menu offers for this month
        expect(result.current.filters.groupBy).toBe(CONST.SEARCH.GROUP_BY.WEEK);
    });

    it('keeps the stored bucket for a single day, which has no buckets to pick from', async () => {
        // Given a dashboard stored grouped by quarter over the last 12 months
        await setUpActivePolicy('PLN');
        await Onyx.merge(ONYXKEYS.SEARCH_FILTERS, {
            [SPEND_SEARCH_KEY]: {
                query: buildInsightsQueryString({date: {preset: CONST.SEARCH.DATE_PRESETS.LAST_12_MONTHS}, policyIDs: [], groupBy: CONST.SEARCH.GROUP_BY.QUARTER, groupCurrency: 'USD'}),
            },
        });
        await waitForBatchedUpdates();
        const {result} = renderHook(() => useInsightsFilters(CONST.INSIGHTS.DASHBOARD.SPEND));
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        // When the date changes to a single custom day
        await act(async () => {
            result.current.setFilters({date: {on: '2026-10-01'}});
            await waitForBatchedUpdates();
        });

        // Then the saved bucket is left as it was
        expect(result.current.filters.groupBy).toBe(CONST.SEARCH.GROUP_BY.QUARTER);
    });
});

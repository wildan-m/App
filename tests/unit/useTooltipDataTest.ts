import {renderHook} from '@testing-library/react-native';

import useTooltipData from '@components/Charts/hooks/useTooltipData';
import type {ChartDataPoint, ChartSeries} from '@components/Charts/types';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';

import type {NonEmptyTuple} from 'type-fest';

import type * as TestHelper from '../utils/TestHelper';

import {translateLocal} from '../utils/TestHelper';

jest.mock('@hooks/useLocalize', () => () => ({
    translate: jest.requireActual<typeof TestHelper>('../utils/TestHelper').translateLocal,
    preferredLocale: 'en',
}));

const SERIES: NonEmptyTuple<ChartSeries> = [{key: 'total'}];
const DATA: ChartDataPoint[] = [{label: 'Jan', values: {total: 100}, count: 3}];
const formatAmount = (value: number) => String(value);

describe('useTooltipData', () => {
    beforeAll(() => {
        IntlStore.load(CONST.LOCALES.EN);
    });

    it('counts expenses by default', () => {
        // Given a point aggregating three rows on a chart that does not name its count unit
        // When its tooltip content is built
        const {result} = renderHook(() => useTooltipData(0, DATA, SERIES, formatAmount));

        // Then the count is labeled as expenses, as on the Spend dashboard
        expect(result.current?.countLabel).toBe(translateLocal('iou.expenseCount', {count: 3}));
        expect(result.current?.countLabel).toBe('3 expenses');
    });

    it('counts reports when the chart counts reports', () => {
        // Given the same point on a chart whose rows are expense reports, as on the Efficiency dashboard
        // When its tooltip content is built
        const {result} = renderHook(() => useTooltipData(0, DATA, SERIES, formatAmount, CONST.INSIGHTS.COUNT_UNIT.REPORT));

        // Then the count is labeled as reports
        expect(result.current?.countLabel).toBe('3 reports');
    });
});

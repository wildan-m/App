import type {ChartCountUnit, ChartDataPoint, ChartSeries} from '@components/Charts/types';
import {getPrimaryValue} from '@components/Charts/utils';

import useLocalize from '@hooks/useLocalize';

import {formatPercentOfTotal} from '@libs/PercentageUtils';

import CONST from '@src/CONST';

import type {NonEmptyTuple} from 'type-fest';

type TooltipData = {
    label: string;
    amount: string;
    percentage?: string;
    countLabel?: string;
};

/**
 * Formats tooltip content for the active chart data point.
 * Computes the display amount of the primary series using the provided formatter and reads the share of total spend and the count, named by its unit, off the point.
 */
function useTooltipData(
    activeDataIndex: number,
    data: ChartDataPoint[],
    series: NonEmptyTuple<ChartSeries>,
    formatAmount: (value: number) => string,
    countUnit: ChartCountUnit = CONST.INSIGHTS.COUNT_UNIT.EXPENSE,
): TooltipData | null {
    const {translate, preferredLocale} = useLocalize();

    if (activeDataIndex < 0 || activeDataIndex >= data.length) {
        return null;
    }
    const dataPoint = data.at(activeDataIndex);
    if (!dataPoint) {
        return null;
    }
    const [{key: primarySeriesKey}] = series;
    const value = getPrimaryValue(dataPoint, primarySeriesKey);

    return {
        label: dataPoint.label,
        amount: formatAmount(value),
        percentage: dataPoint.percentOfTotal === undefined ? undefined : formatPercentOfTotal(dataPoint.percentOfTotal, value, preferredLocale),
        countLabel: dataPoint.count === undefined ? undefined : translate(countUnit === CONST.INSIGHTS.COUNT_UNIT.REPORT ? 'iou.reportCount' : 'iou.expenseCount', {count: dataPoint.count}),
    };
}

export default useTooltipData;

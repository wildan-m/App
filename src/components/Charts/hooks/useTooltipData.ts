import type {ChartDataPoint, ChartSeries} from '@components/Charts/types';

import useLocalize from '@hooks/useLocalize';

import {formatPercentOfTotal} from '@libs/PercentageUtils';

type TooltipRow = {
    /** The series' key */
    key: string;

    /** Series name, absent for a single unnamed series */
    label?: string;

    /** The series' formatted amount at the active point */
    amount: string;

    /** The amount's share of total spend, shown only when a single series is plotted */
    percentage?: string;
};

type TooltipData = {
    /** The active point's label */
    title: string;

    /** One row per series that has a value at the active point */
    rows: TooltipRow[];

    /** Translated expense count of the primary series, shown only when a single series is plotted */
    expenseCount?: string;
};

/**
 * Formats tooltip content for the active chart data point: one row per plotted series.
 * The share of total spend and the expense count show for a single series only, not when datasets are compared.
 */
function useTooltipData(activeDataIndex: number, data: ChartDataPoint[], series: ChartSeries[], formatAmount: (value: number) => string): TooltipData | null {
    const {translate, preferredLocale} = useLocalize();

    if (activeDataIndex < 0 || activeDataIndex >= data.length) {
        return null;
    }
    const dataPoint = data.at(activeDataIndex);
    if (!dataPoint) {
        return null;
    }

    const isSingleSeries = series.length === 1;

    return {
        title: dataPoint.label,
        // A series with nothing at this point gets no row.
        rows: series.flatMap((seriesItem) => {
            const value = dataPoint.values[seriesItem.key];
            if (value === undefined) {
                return [];
            }

            return {
                key: seriesItem.key,
                label: isSingleSeries ? undefined : dataPoint.seriesLabels?.[seriesItem.key],
                amount: formatAmount(value),
                percentage: isSingleSeries && dataPoint.percentOfTotal !== undefined ? formatPercentOfTotal(dataPoint.percentOfTotal, value, preferredLocale) : undefined,
            };
        }),
        expenseCount: isSingleSeries && dataPoint.count !== undefined ? translate('iou.expenseCount', {count: dataPoint.count}) : undefined,
    };
}

export default useTooltipData;
export type {TooltipRow};

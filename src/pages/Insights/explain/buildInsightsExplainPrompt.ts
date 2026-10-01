import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {InsightsChartSpec} from '@pages/Insights/dashboardSpecs';
import type {InsightsFilters} from '@pages/Insights/insightsFilters';
import {applyInsightsFilters} from '@pages/Insights/insightsQueries';

/**
 * Builds the message the chart's Explain button sends to Concierge. It names the chart and carries the chart's own query with the
 * page's filters applied (date, workspaces, group-by, currency, comparison, view, sort and limit), so Concierge reads the same data the chart draws.
 */
function buildInsightsExplainPrompt(chart: InsightsChartSpec, filters: InsightsFilters, translate: LocalizedTranslate): string {
    const chartQuery = applyInsightsFilters(chart, filters, filters.compare);
    return translate('insightsPage.explainChartPrompt', translate(chart.titleKey), chartQuery);
}

export default buildInsightsExplainPrompt;

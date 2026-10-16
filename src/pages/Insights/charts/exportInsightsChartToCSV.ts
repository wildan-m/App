import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import {buildViewOnSpendQuery} from '@components/Search/chartDrillDown';
import type {SearchColumnType, SearchQueryJSON} from '@components/Search/types';

import {queueExportSearchItemsToCSV} from '@libs/actions/Search';
import Log from '@libs/Log';
import {buildSearchQueryJSON, serializeQueryJSONForBackend} from '@libs/SearchQueryUtils';
import {getColumnsToShow, getSearchColumnTranslationKey, getValidGroupBy} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';

/**
 * Exports the grouped totals a chart plots. It queries what "View on Spend" opens, so the file follows the chart's
 * grouping and the page's date, workspace and group currency filters, over every group in the period rather than the
 * chart's top slice. It asks for the same columns as a grouped "Current view" export on Spend, the group's columns
 * (label, expense count and total) on top of the default expense columns, since the export rejects a request without
 * expense columns.
 * The export runs through the queued flow, so a small file downloads right away and a larger one arrives from Concierge.
 */
function exportInsightsChartToCSV(queryJSON: Readonly<SearchQueryJSON>, exportName: string, translate: LocalizedTranslate) {
    const exportQueryJSON = buildSearchQueryJSON(buildViewOnSpendQuery(queryJSON));
    const groupBy = getValidGroupBy(exportQueryJSON?.groupBy);
    if (!exportQueryJSON || !groupBy) {
        Log.alert('[exportInsightsChartToCSV] Failed to build the grouped export query for a chart');
        return;
    }

    const groupColumns = getColumnsToShow({currentAccountID: undefined, data: {}, type: CONST.SEARCH.DATA_TYPES.EXPENSE, groupBy}).filter(
        (column) => column !== CONST.SEARCH.TABLE_COLUMNS.AVATAR && column !== CONST.SEARCH.TABLE_COLUMNS.ACTION,
    );
    const columns: SearchColumnType[] = [CONST.SEARCH.TABLE_COLUMNS.TYPE, ...Object.values(CONST.SEARCH.TYPE_DEFAULT_COLUMNS.EXPENSE)];
    const exportColumnLabels: Partial<Record<SearchColumnType, string>> = {};
    for (const column of [...columns, ...groupColumns]) {
        exportColumnLabels[column] = translate(getSearchColumnTranslationKey(column, CONST.SEARCH.DATA_TYPES.EXPENSE));
    }

    queueExportSearchItemsToCSV({
        jsonQuery: serializeQueryJSONForBackend({...exportQueryJSON, columns, groupColumns}),
        reportIDList: [],
        transactionIDList: [],
        isBasicExport: false,
        exportColumnLabels: JSON.stringify(exportColumnLabels),
        exportName,
    });
}

export default exportInsightsChartToCSV;

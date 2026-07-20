import measureTextWidth from '@libs/TextMeasurement';

import variables from '@styles/variables';

import type {TableColumn, TableData, TableRow} from './types';

// Horizontal margin between a header label and its sort arrow (styles.ml1)
const SORT_ICON_MARGIN = 4;

// Widths derived from the first rows are representative enough beyond this, and capping the
// scan keeps the layout pass O(1) with respect to very large datasets.
const MAX_MEASURED_ROWS = 500;

/**
 * Builds the shared CSS grid track list for a table. Fixed-width columns keep their configured width, columns that
 * expose their cell text via getCellContent are sized to their widest content (clamped to min/maxWidth), and the
 * remaining columns share the leftover space equally (1fr).
 *
 * The tracks are computed once per table and distributed through TableContext: every virtualized row is its own
 * independent grid, so content-based CSS sizing (max-content/auto) would let each row resolve different track
 * widths and break the vertical column alignment.
 */
function getGridTemplateColumns<DataType extends TableData, ColumnKey extends string = string>(
    columns: Array<TableColumn<ColumnKey, DataType>>,
    processedData: Array<TableRow<DataType>>,
): string[] {
    return columns.map((column) => {
        if (column.width) {
            return `${column.width}px`;
        }

        const {getCellContent} = column;
        if (!getCellContent) {
            return '1fr';
        }

        // The header must fit too: labels render in the small supporting font and reserve room for the sort arrow.
        let maxContentWidth = measureTextWidth(column.label, variables.fontSizeSmall) + (column.sortable ? variables.iconSizeExtraSmall + SORT_ICON_MARGIN : 0);

        const rowsToMeasure = Math.min(processedData.length, MAX_MEASURED_ROWS);
        for (let index = 0; index < rowsToMeasure; index++) {
            const item = processedData.at(index);
            if (item) {
                maxContentWidth = Math.max(maxContentWidth, measureTextWidth(getCellContent(item), variables.fontSizeNormal));
            }
        }

        const contentWidth = Math.ceil(maxContentWidth + (column.contentInset ?? 0));
        const clampedWidth = Math.min(Math.max(contentWidth, column.minWidth ?? 0), column.maxWidth ?? Number.MAX_SAFE_INTEGER);
        return `${clampedWidth}px`;
    });
}

export default getGridTemplateColumns;

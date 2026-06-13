import CONST from '@src/CONST';

const TABLE_COLUMNS = CONST.SEARCH.TABLE_COLUMNS;
const validColumnIds = new Set<string>(Object.values(TABLE_COLUMNS));

/**
 * Guard test for the single source of truth that drives the two "Edit columns" surfaces.
 *
 * `CONST.SEARCH.TYPE_CUSTOM_COLUMNS.EXPENSE` (Search) and `CONST.SEARCH.REPORT_DETAILS_CUSTOM_COLUMNS`
 * (Report Details) are both derived from `CONST.SEARCH.COLUMN_AVAILABILITY`. These assertions ensure the
 * two lists can no longer silently drift: every column's availability is declared in one place, every id
 * is a real `TABLE_COLUMNS` value, and any deliberate availability change must update the snapshots below
 * (and therefore be reviewed).
 */
describe('Issue 93522 - column availability single source of truth', () => {
    it('declares only valid TABLE_COLUMNS ids in COLUMN_AVAILABILITY', () => {
        Object.values(CONST.SEARCH.COLUMN_AVAILABILITY).forEach((column) => {
            expect(validColumnIds.has(column.id)).toBe(true);
        });
    });

    it('derives the Search (EXPENSE) list from the search flag, preserving order', () => {
        const expected = Object.values(CONST.SEARCH.COLUMN_AVAILABILITY)
            .filter((column) => column.search)
            .map((column) => column.id);
        expect([...CONST.SEARCH.TYPE_CUSTOM_COLUMNS.EXPENSE]).toEqual(expected);
    });

    it('derives the Report Details list from the reportView flag, preserving order', () => {
        const expected = Object.values(CONST.SEARCH.COLUMN_AVAILABILITY)
            .filter((column) => column.reportView)
            .map((column) => column.id);
        expect([...CONST.SEARCH.REPORT_DETAILS_CUSTOM_COLUMNS]).toEqual(expected);
    });

    it('keeps both derived lists made of valid TABLE_COLUMNS ids', () => {
        [...CONST.SEARCH.TYPE_CUSTOM_COLUMNS.EXPENSE, ...CONST.SEARCH.REPORT_DETAILS_CUSTOM_COLUMNS].forEach((id) => {
            expect(validColumnIds.has(id)).toBe(true);
        });
    });

    it('locks the current Search column set (change requires a deliberate review)', () => {
        expect([...CONST.SEARCH.TYPE_CUSTOM_COLUMNS.EXPENSE]).toEqual([
            TABLE_COLUMNS.RECEIPT,
            TABLE_COLUMNS.DATE,
            TABLE_COLUMNS.STATUS,
            TABLE_COLUMNS.SUBMITTED,
            TABLE_COLUMNS.APPROVED,
            TABLE_COLUMNS.POSTED,
            TABLE_COLUMNS.EXPORTED,
            TABLE_COLUMNS.MERCHANT,
            TABLE_COLUMNS.DESCRIPTION,
            TABLE_COLUMNS.FROM,
            TABLE_COLUMNS.TO,
            TABLE_COLUMNS.POLICY_NAME,
            TABLE_COLUMNS.CARD,
            TABLE_COLUMNS.CATEGORY,
            TABLE_COLUMNS.CATEGORY_GL_CODE,
            TABLE_COLUMNS.ATTENDEES,
            TABLE_COLUMNS.TOTAL_PER_ATTENDEE,
            TABLE_COLUMNS.TAG,
            TABLE_COLUMNS.EXCHANGE_RATE,
            TABLE_COLUMNS.ORIGINAL_AMOUNT,
            TABLE_COLUMNS.REPORT_ID,
            TABLE_COLUMNS.BASE_62_REPORT_ID,
            TABLE_COLUMNS.REIMBURSABLE,
            TABLE_COLUMNS.BILLABLE,
            TABLE_COLUMNS.MCC,
            TABLE_COLUMNS.TAX_CODE,
            TABLE_COLUMNS.TAX_RATE,
            TABLE_COLUMNS.TAX_AMOUNT,
            TABLE_COLUMNS.TITLE,
            TABLE_COLUMNS.TOTAL_AMOUNT,
            TABLE_COLUMNS.EXPORTED_TO,
            TABLE_COLUMNS.ACTION,
            TABLE_COLUMNS.WITHDRAWAL_ID,
        ]);
    });

    it('locks the current Report Details column set (change requires a deliberate review)', () => {
        expect([...CONST.SEARCH.REPORT_DETAILS_CUSTOM_COLUMNS]).toEqual([
            TABLE_COLUMNS.RECEIPT,
            TABLE_COLUMNS.DATE,
            TABLE_COLUMNS.MERCHANT,
            TABLE_COLUMNS.DESCRIPTION,
            TABLE_COLUMNS.CARD,
            TABLE_COLUMNS.CATEGORY,
            TABLE_COLUMNS.CATEGORY_GL_CODE,
            TABLE_COLUMNS.TAG,
            TABLE_COLUMNS.EXCHANGE_RATE,
            TABLE_COLUMNS.REIMBURSABLE,
            TABLE_COLUMNS.BILLABLE,
            TABLE_COLUMNS.MCC,
            TABLE_COLUMNS.TAX_CODE,
            TABLE_COLUMNS.TAX_RATE,
            TABLE_COLUMNS.TAX_AMOUNT,
            TABLE_COLUMNS.TOTAL_AMOUNT,
            TABLE_COLUMNS.TOTAL,
            TABLE_COLUMNS.WITHDRAWAL_ID,
        ]);
    });
});

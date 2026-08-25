import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

/** Which count the Search footer displays */
type SearchFooterCountType = ValueOf<typeof CONST.SEARCH.FOOTER_COUNT_TYPES>;

/** Which spend aggregate the Search footer displays */
type SearchFooterTotalType = ValueOf<typeof CONST.SEARCH.FOOTER_TOTAL_TYPES>;

/** The footer selections a user made for one search type */
type SearchFooterSelection = {
    /** Selected count (expenses or reports) */
    countType?: SearchFooterCountType;

    /** Selected spend aggregate */
    totalType?: SearchFooterTotalType;

    /** Selected currency the total is displayed in */
    currency?: string;
};

/**
 * Search footer selections, keyed by search data type (`expense`, `expense-report`, ...) so a choice made on one
 * search type never carries over to another.
 */
type SearchFooterSelections = Partial<Record<string, SearchFooterSelection>>;

export default SearchFooterSelections;
export type {SearchFooterSelection, SearchFooterCountType, SearchFooterTotalType};

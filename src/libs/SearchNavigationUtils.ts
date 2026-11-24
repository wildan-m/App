import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {SearchFilters} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import type {FlatNavSection, FlatNavSubnavRow} from './Navigation/FlatNav/types';
import type {SearchKey} from './SearchKeyUtils';

import {setSearchContext} from './actions/Search';
import FLAT_NAV from './Navigation/FlatNav/FLAT_NAV';
import {getFlatNavSectionDefaultItem} from './Navigation/FlatNav/FlatNavUtils';
import Navigation from './Navigation/Navigation';
import {buildCannedSearchQuery, getValidLastQuery, normalizeDatePresetsInQuery} from './SearchQueryUtils';
import {getLastSearchQuery} from './SearchUIUtils';

/** The Spend searches that have a tab of their own on narrow layouts. Every user has both. */
type SpendTabSearchKey = typeof CONST.SEARCH.SEARCH_KEYS.EXPENSES | typeof CONST.SEARCH.SEARCH_KEYS.REPORTS;

function navigateToCannedSpendSearch(searchKey: SearchKey, searchQuery: string, lastSearchQuery: string | undefined, clearSelectedTransactions: () => void) {
    clearSelectedTransactions();
    setSearchContext(false);
    const query = getValidLastQuery(lastSearchQuery, searchQuery, searchKey);
    Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query, searchKey}));
}

/** Opens the Expenses or Reports tab on the query the user last left it with. */
function navigateToSpendTab(searchKey: SpendTabSearchKey, lastSearchQuery: string | undefined, clearSelectedTransactions: () => void) {
    const searchQuery = buildCannedSearchQuery(searchKey === CONST.SEARCH.SEARCH_KEYS.REPORTS ? {type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT} : undefined);
    navigateToCannedSpendSearch(searchKey, searchQuery, lastSearchQuery, clearSelectedTransactions);
}

/** Opens a search as it was last seen, such as a saved search. */
function navigateToSearch({query, searchKey, name}: {query: string; searchKey?: SearchKey; name?: string}) {
    setSearchContext(false);
    Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query, name, searchKey}));
}

/** Opens a flat nav row on the query the user last left it with. A page row opens its first member, the way its section's row does. */
function navigateToFlatNavItem(item: FlatNavSubnavRow, searchFilters: OnyxEntry<SearchFilters>, clearSelectedTransactions: () => void) {
    if (item.type === FLAT_NAV.ITEM_TYPE.PAGE) {
        const firstMemberItem = item.memberItems.at(0);
        if (!firstMemberItem) {
            return;
        }
        navigateToFlatNavItem(firstMemberItem, searchFilters, clearSelectedTransactions);
        return;
    }

    const lastSearchQuery = getLastSearchQuery(searchFilters, item.key);

    if (item.type === FLAT_NAV.ITEM_TYPE.CANNED_SEARCH) {
        navigateToCannedSpendSearch(item.key, item.searchQuery, lastSearchQuery, clearSelectedTransactions);
        return;
    }

    clearSelectedTransactions();
    navigateToSearch({query: normalizeDatePresetsInQuery(getValidLastQuery(lastSearchQuery, item.query, item.key)), name: item.name, searchKey: item.key});
}

/** Opens the item a section lands on. Does nothing when the section has no item that can be opened. */
function navigateToFlatNavSection(section: FlatNavSection, searchFilters: OnyxEntry<SearchFilters>, clearSelectedTransactions: () => void) {
    const defaultItem = getFlatNavSectionDefaultItem(section);
    if (!defaultItem) {
        return;
    }
    navigateToFlatNavItem(defaultItem, searchFilters, clearSelectedTransactions);
}

export default navigateToCannedSpendSearch;
export {navigateToFlatNavItem, navigateToFlatNavSection, navigateToSearch, navigateToSpendTab};
export type {SpendTabSearchKey};

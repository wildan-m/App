import type {LocaleContextProps} from '@components/LocaleContextProvider';

import type {SearchTypeMenuItem} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {SaveSearchItem} from '@src/types/onyx/SaveSearch';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';

type SearchPageHeaderTitleDeps = {
    translate: LocaleContextProps['translate'];

    /** The `type` of the current search query, used for the data-type fallbacks */
    type: SearchDataTypes | undefined;

    /** The saved search the current query maps to, if any */
    activeSavedSearch: SaveSearchItem | undefined;

    /** The matched suggested-search menu item, if any */
    selectedItem: SearchTypeMenuItem | undefined;

    /** Label of the collapsed page the search sits behind, when flat nav fronts it with tabs, e.g. "Month end close" */
    collapsedPageTranslationPath?: TranslationPaths;
};

/**
 * Resolves the title for the wide Search page content header, which names the current view. The narrow header is the
 * top-level page title and stays a static "Spend", so it deliberately doesn't use this helper. The priority chain is:
 *   a. the active saved search's display name,
 *   b. the matched suggested-search label, then the data-type fallbacks (task / trip / invoice / chat),
 *   c. the generic "Spend" fallback.
 */
function getSearchPageHeaderTitle({translate, type, activeSavedSearch, selectedItem, collapsedPageTranslationPath}: SearchPageHeaderTitleDeps): string {
    // a. Active saved search display name. `name` is a display string, not a translation key, so it's used directly
    // (matching the LHN, which renders `item.name` for the `name !== query` case).
    if (activeSavedSearch?.name) {
        return activeSavedSearch.name;
    }

    // b. The collapsed page fronting the search: its searches are tabs of one page, so they all read as that page.
    if (collapsedPageTranslationPath) {
        return translate(collapsedPageTranslationPath);
    }

    // b (cont.). Matched suggested search.
    if (selectedItem) {
        return translate(selectedItem.translationPath);
    }

    // b (cont.). Data-type fallbacks.
    if (type === CONST.SEARCH.DATA_TYPES.TASK) {
        return translate('common.tasks');
    }
    if (type === CONST.SEARCH.DATA_TYPES.TRIP) {
        return translate('travel.trips');
    }
    if (type === CONST.SEARCH.DATA_TYPES.INVOICE) {
        return translate('workspace.common.invoices');
    }
    if (type === CONST.SEARCH.DATA_TYPES.CHAT) {
        return translate('common.chats');
    }

    // c. Generic fallback.
    return translate('common.spend');
}

export default getSearchPageHeaderTitle;

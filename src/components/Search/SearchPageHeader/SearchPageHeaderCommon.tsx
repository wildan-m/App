import useShouldUseFlatNavigationBar from '@components/Navigation/FlatNavigationBar/useShouldUseFlatNavigationBar';
import TopBar from '@components/Navigation/TopBar';
import {useSearchQueryContext} from '@components/Search/SearchContext';

import useActiveSavedSearch from '@hooks/useActiveSavedSearch';
import useLocalize from '@hooks/useLocalize';

import {getFlatNavCollapsedPageForSearchKey} from '@libs/Navigation/FlatNav/FlatNavUtils';

import type {SearchDataTypes} from '@src/types/onyx/SearchResults';

import getSearchPageHeaderTitle from './getSearchPageHeaderTitle';

type SearchPageHeaderCommonProps = {
    queryJSONType: SearchDataTypes;
};

function SearchPageHeaderCommon({queryJSONType}: SearchPageHeaderCommonProps) {
    const {translate} = useLocalize();
    const {currentSearchKey, suggestedSearches} = useSearchQueryContext();
    const selectedItem = currentSearchKey ? suggestedSearches[currentSearchKey] : undefined;
    const activeSavedSearch = useActiveSavedSearch();
    const shouldUseFlatNavigationBar = useShouldUseFlatNavigationBar();
    const collapsedPage = shouldUseFlatNavigationBar ? getFlatNavCollapsedPageForSearchKey(currentSearchKey) : undefined;
    const title = getSearchPageHeaderTitle({translate, type: queryJSONType, activeSavedSearch, selectedItem, collapsedPageTranslationPath: collapsedPage?.translationPath});

    return (
        <TopBar
            breadcrumbLabel={title}
            shouldDisplayHelpButton
        />
    );
}

export default SearchPageHeaderCommon;

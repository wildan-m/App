import useShouldUseFlatNavigationBar from '@components/Navigation/FlatNavigationBar/useShouldUseFlatNavigationBar';
/** Pill tabs across the top of a collapsed page like Month end close: one per visible search the page fronts, in the order their section lists them. */
import {useSearchQueryContext} from '@components/Search/SearchContext';
import TabSelectorBase from '@components/TabSelector/TabSelectorBase';
import TabSelectorContextProvider from '@components/TabSelector/TabSelectorContext';
import type {TabSelectorBaseItem} from '@components/TabSelector/types';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFlatNavCollapsedPageForSearchKey, getFlatNavCollapsedPageMemberItems} from '@libs/Navigation/FlatNav/FlatNavUtils';
import useFlatNavNavigation from '@libs/Navigation/FlatNav/useFlatNavNavigation';
import useFlatNavSections from '@libs/Navigation/FlatNav/useFlatNavSections';
import {getSearchTypeMenuItemSentryLabel} from '@libs/SearchUIUtils';

import React from 'react';
import {View} from 'react-native';

function SearchCollapsedPageTabs() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {currentSearchKey} = useSearchQueryContext();
    const shouldUseFlatNavigationBar = useShouldUseFlatNavigationBar();
    const collapsedPage = shouldUseFlatNavigationBar ? getFlatNavCollapsedPageForSearchKey(currentSearchKey) : undefined;
    const sections = useFlatNavSections({isActive: !!collapsedPage});
    const memberItems = collapsedPage ? getFlatNavCollapsedPageMemberItems(sections, currentSearchKey) : [];
    const icons = useMemoizedLazyExpensifyIcons(memberItems.map((item) => item.iconName));
    const {navigateToItem} = useFlatNavNavigation();

    if (!collapsedPage || !currentSearchKey || memberItems.length === 0) {
        return null;
    }

    const tabs: TabSelectorBaseItem[] = memberItems.map((item) => ({
        key: item.key,
        title: translate(item.translationPath),
        icon: icons[item.iconName],
        badgeText: item.badgeText,
        sentryLabel: getSearchTypeMenuItemSentryLabel(item.key),
    }));

    const selectTab = (key: string) => {
        const selectedItem = memberItems.find((item) => item.key === key);
        if (!selectedItem || selectedItem.key === currentSearchKey) {
            return;
        }
        navigateToItem(selectedItem);
    };

    return (
        <View style={[styles.ph5, styles.pt2]}>
            <TabSelectorContextProvider activeTabKey={currentSearchKey}>
                <TabSelectorBase
                    tabs={tabs}
                    activeTabKey={currentSearchKey}
                    onTabPress={selectTab}
                />
            </TabSelectorContextProvider>
        </View>
    );
}

export default SearchCollapsedPageTabs;

import React from 'react';
import type {ValueOf} from 'type-fest';
import {PressableWithFeedback} from '@components/Pressable';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import clearSelectedText from '@libs/clearSelectedText/clearSelectedText';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import {getSearchTabStateFromSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import Navigation from '@libs/Navigation/Navigation';
import {buildCannedSearchQuery, buildSearchQueryJSON, buildSearchQueryString} from '@libs/SearchQueryUtils';
import {startSpan} from '@libs/telemetry/activeSpans';
import navigationRef from '@navigation/navigationRef';
import type {SearchFullscreenNavigatorParamList} from '@navigation/types';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';
import getLastRoute from './getLastRoute';
import NAVIGATION_TABS from './NAVIGATION_TABS';
import TabBarItem from './TabBarItem';

type SearchTabButtonProps = {
    selectedTab: ValueOf<typeof NAVIGATION_TABS>;
    isWideLayout: boolean;
};

function SearchTabButton({selectedTab, isWideLayout}: SearchTabButtonProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['ReceiptMultiple']);
    const [lastSearchParams] = useOnyx(ONYXKEYS.REPORT_NAVIGATION_LAST_SEARCH_QUERY);
    const searchAccessibilityState = {selected: selectedTab === NAVIGATION_TABS.SEARCH};

    const navigateToSearch = () => {
        if (selectedTab === NAVIGATION_TABS.SEARCH) {
            return;
        }
        clearSelectedText();
        interceptAnonymousUser(() => {
            startSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS, {
                name: CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS,
                op: CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS,
                forceTransaction: true,
            });

            // Try to restore the search the user last had open. The route params (`q` plus the rest) are
            // turned into a query string and navigated to. Returns true when navigation happened.
            const navigateToSearchRoute = (searchRouteParams: SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT] | undefined) => {
                if (!searchRouteParams) {
                    return false;
                }
                const {q, ...rest} = searchRouteParams;
                const queryJSON = buildSearchQueryJSON(q);
                if (!queryJSON) {
                    return false;
                }
                const query = buildSearchQueryString(queryJSON);
                Navigation.navigate(
                    ROUTES.SEARCH_ROOT.getRoute({
                        query,
                        ...rest,
                    }),
                );
                return true;
            };

            // 1. Fast in-memory path: the preserved navigator state, if it's still mounted.
            const lastSearchRoute = getLastRoute(navigationRef.getRootState(), NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, SCREENS.SEARCH.ROOT);
            if (navigateToSearchRoute(lastSearchRoute?.params as SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT] | undefined)) {
                return;
            }

            // 2. Durable fallback: the last Spend-tab path saved in sessionStorage. Unlike the preserved
            // state (cleaned when the Search navigator unmounts on a tab switch) and the Onyx value below
            // (only written when a report is opened), this is saved on every navigation within the Spend tab,
            // so it survives bouncing to another tab even when the user just selected a search in the LHN.
            const sessionSearchRouteParams = getSearchTabStateFromSessionStorage()
                ?.routes?.find((route) => route.name === NAVIGATORS.TAB_NAVIGATOR)
                ?.state?.routes?.find((route) => route.name === NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR)
                ?.state?.routes?.findLast((route) => route.name === SCREENS.SEARCH.ROOT)?.params as
                | SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT]
                | undefined;
            if (navigateToSearchRoute(sessionSearchRouteParams)) {
                return;
            }

            // 3. Onyx fallback (last opened report's search), then the default canned search.
            const lastQueryJSON = lastSearchParams?.queryJSON;
            const lastQueryFromOnyx = lastQueryJSON ? buildSearchQueryString(lastQueryJSON) : undefined;
            const defaultSearchQuery = buildCannedSearchQuery({type: CONST.SEARCH.DATA_TYPES.EXPENSE});
            Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: lastQueryFromOnyx ?? defaultSearchQuery}));
        });
    };

    if (isWideLayout) {
        return (
            <PressableWithFeedback
                onPress={navigateToSearch}
                role={CONST.ROLE.TAB}
                accessibilityLabel={translate('common.spend')}
                accessibilityState={searchAccessibilityState}
                style={({hovered}) => [styles.leftNavigationTabBarItem, hovered && styles.navigationTabBarItemHovered]}
                sentryLabel={CONST.SENTRY_LABEL.NAVIGATION_TAB_BAR.REPORTS}
            >
                {({hovered}) => (
                    <TabBarItem
                        icon={expensifyIcons.ReceiptMultiple}
                        label={translate('common.spend')}
                        isSelected={selectedTab === NAVIGATION_TABS.SEARCH}
                        isHovered={hovered}
                    />
                )}
            </PressableWithFeedback>
        );
    }

    return (
        <PressableWithFeedback
            onPress={navigateToSearch}
            role={CONST.ROLE.TAB}
            accessibilityLabel={translate('common.spend')}
            accessibilityState={searchAccessibilityState}
            wrapperStyle={styles.flex1}
            style={styles.navigationTabBarItem}
            sentryLabel={CONST.SENTRY_LABEL.NAVIGATION_TAB_BAR.REPORTS}
        >
            <TabBarItem
                icon={expensifyIcons.ReceiptMultiple}
                label={translate('common.spend')}
                isSelected={selectedTab === NAVIGATION_TABS.SEARCH}
                numberOfLines={1}
            />
        </PressableWithFeedback>
    );
}

export default SearchTabButton;

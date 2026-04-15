import type {LinkingOptions} from '@react-navigation/native';
import {findFocusedRoute} from '@react-navigation/native';
import {Linking} from 'react-native';
import navigationRef from '@libs/Navigation/navigationRef';
import type {RootNavigatorParamList} from '@libs/Navigation/types';
import ROUTES from '@src/ROUTES';

// Tab route names whose deep links should be dropped when the user is already focused on them.
// Prevents a re-navigation (and flicker from the remount) from a GPS live update notification
// or from an Android static shortcut (SmartScan, Manually Create) tapped while the target tab
// is already visible.
const TAB_ROUTES_WITH_SELF_DEDUP: readonly string[] = [
    ROUTES.DISTANCE_REQUEST_CREATE_TAB_GPS.route,
    ROUTES.MONEY_REQUEST_CREATE_TAB_SCAN.route,
    ROUTES.MONEY_REQUEST_CREATE_TAB_MANUAL.route,
];

function getDedupTabRouteForDeepLink(url: string): string | undefined {
    // Strip query string / hash and look at the last path segment, so tokens like "scan" or "manual"
    // cannot match loosely inside unrelated URLs.
    const pathOnly = url.split(/[?#]/).at(0) ?? url;
    const lastSegment = pathOnly.split('/').findLast(Boolean);
    if (!lastSegment) {
        return undefined;
    }
    return TAB_ROUTES_WITH_SELF_DEDUP.find((route) => route === lastSegment);
}

const subscribe: LinkingOptions<RootNavigatorParamList>['subscribe'] = (listener) => {
    const subscription = Linking.addEventListener('url', ({url}: {url: string}) => {
        const targetTabRoute = getDedupTabRouteForDeepLink(url);
        if (targetTabRoute) {
            const state = navigationRef.current?.getRootState();
            if (state) {
                const currentRoute = findFocusedRoute(state);
                if (currentRoute?.name === targetTabRoute) {
                    return;
                }
            }
        }
        listener(url);
    });
    return () => subscription.remove();
};

export default subscribe;

import type {NavigationPartialRoute, NavigationRoute} from '@libs/Navigation/types';

import NAVIGATORS from '@src/NAVIGATORS';
import type {Route as RoutePath} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import findFocusedRouteWithOnyxTabGuard from './findFocusedRouteWithOnyxTabGuard';
import getStateFromPath from './getStateFromPath';

function isRouteWithBackToParam(route: NavigationRoute): route is NavigationRoute & {params: {backTo: RoutePath}} {
    return route.params !== undefined && 'backTo' in route.params && typeof route.params.backTo === 'string';
}

/**
 * Walks the `backTo` chain of a right modal (RHP) route and collects every ancestor that is itself an RHP.
 *
 * When state is built from a path (deeplink / browser refresh / cold load) only the screen the URL points at ends up in
 * the RHP stack. Ancestors are resolved solely to pick the full screen route rendered underneath, so an RHP that was
 * opened on top of another RHP loses the one below it. The routes returned here are inserted back under the focused RHP
 * so the stack matches what in-app navigation would have produced.
 *
 * The walk stops at the first ancestor that is not an RHP, because that one is the full screen route and is already
 * handled by `getMatchingFullScreenRoute`.
 *
 * @param focusedRoute - The focused (topmost) RHP route built from the path.
 * @returns The ancestor RHP routes, ordered from the bottom of the stack to the direct parent of `focusedRoute`.
 */
function getRightModalRoutesFromBackToChain(focusedRoute: NavigationRoute): NavigationPartialRoute[] {
    const ancestors: NavigationPartialRoute[] = [];
    const visitedPaths = new Set<string>();
    let currentRoute: NavigationRoute = focusedRoute;

    while (isRouteWithBackToParam(currentRoute)) {
        const backTo = currentRoute.params.backTo;

        // Guard against a malformed backTo chain pointing back at a path we already expanded.
        if (visitedPaths.has(backTo)) {
            break;
        }
        visitedPaths.add(backTo);

        const stateForBackTo = getStateFromPath(backTo);
        const lastRoute = stateForBackTo?.routes.at(-1);

        // This may happen if the backTo url is invalid.
        if (!stateForBackTo || !lastRoute || lastRoute.name === SCREENS.NOT_FOUND) {
            break;
        }

        // The first non-RHP ancestor is the full screen route underneath, which is resolved separately.
        if (lastRoute.name !== NAVIGATORS.RIGHT_MODAL_NAVIGATOR) {
            break;
        }

        const focusedRouteForBackTo = findFocusedRouteWithOnyxTabGuard(stateForBackTo);

        if (!focusedRouteForBackTo) {
            break;
        }

        ancestors.unshift(focusedRouteForBackTo);
        currentRoute = focusedRouteForBackTo;
    }

    return ancestors;
}

export default getRightModalRoutesFromBackToChain;

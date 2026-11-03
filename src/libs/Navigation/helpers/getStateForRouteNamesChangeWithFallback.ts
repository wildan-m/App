import Log from '@libs/Log';

import type {ParamListBase, StackNavigationState, StackRouter} from '@react-navigation/native';

type StackRouterInstance = ReturnType<typeof StackRouter>;

type RouteNamesChangeOptions = Parameters<StackRouterInstance['getStateForRouteNamesChange']>[1];

/**
 * The stock StackRouter.getStateForRouteNamesChange reads `state.routes` and `state.preloadedRoutes` without guards, so a
 * navigator state that skipped the router's normalization crashes the render when the navigator's screen list changes.
 * This defaults the missing fields to empty arrays before delegating, so the stock router re-seeds the initial route
 * instead, and logs which navigator held the malformed state.
 */
function getStateForRouteNamesChangeWithFallback(stackRouter: StackRouterInstance, navigatorName: string) {
    return (state: StackNavigationState<ParamListBase>, options: RouteNamesChangeOptions): StackNavigationState<ParamListBase> => {
        const hasRoutes = Array.isArray(state.routes);
        const hasPreloadedRoutes = Array.isArray(state.preloadedRoutes);

        if (hasRoutes && hasPreloadedRoutes) {
            return stackRouter.getStateForRouteNamesChange(state, options);
        }

        Log.hmmm(`[getStateForRouteNamesChangeWithFallback] ${navigatorName} state is missing routes or preloadedRoutes on a route names change`, {hasRoutes, hasPreloadedRoutes});

        const routes = hasRoutes ? state.routes : [];
        return stackRouter.getStateForRouteNamesChange(
            {
                ...state,
                routes,
                preloadedRoutes: hasPreloadedRoutes ? state.preloadedRoutes : [],
                index: Number.isInteger(state.index) ? state.index : Math.max(routes.length - 1, 0),
            },
            options,
        );
    };
}

export default getStateForRouteNamesChangeWithFallback;

import getStateForRouteNamesChangeWithFallback from '@libs/Navigation/helpers/getStateForRouteNamesChangeWithFallback';

import {getPreservedNavigatorState} from '@navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';

import type {RouterConfigOptions} from '@react-navigation/native';

import {StackRouter} from '@react-navigation/native';

import type RightModalNavigatorRouterOptions from './types';

function RightModalRouter(options: RightModalNavigatorRouterOptions) {
    const stackRouter = StackRouter(options);

    return {
        ...stackRouter,
        getInitialState({routeNames, routeParamList, routeGetIdList}: RouterConfigOptions) {
            const preservedState = getPreservedNavigatorState(options.parentRoute.key);
            return preservedState ?? stackRouter.getInitialState({routeNames, routeParamList, routeGetIdList});
        },
        getStateForRouteNamesChange: getStateForRouteNamesChangeWithFallback(stackRouter, options.parentRoute.name),
    };
}

export default RightModalRouter;

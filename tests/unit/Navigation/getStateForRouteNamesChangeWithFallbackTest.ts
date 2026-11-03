import Log from '@libs/Log';
import getStateForRouteNamesChangeWithFallback from '@libs/Navigation/helpers/getStateForRouteNamesChangeWithFallback';

import type {ParamListBase, StackNavigationState} from '@react-navigation/native';

import {StackRouter} from '@react-navigation/native';

const ROUTE_NAMES = ['Home', 'Details'];
const CHANGE_OPTIONS = {routeNames: ROUTE_NAMES, routeParamList: {}, routeGetIdList: {}, routeKeyChanges: []};

describe('getStateForRouteNamesChangeWithFallback', () => {
    let hmmmSpy: jest.SpyInstance;

    beforeEach(() => {
        hmmmSpy = jest.spyOn(Log, 'hmmm').mockImplementation(() => {});
    });

    afterEach(() => {
        hmmmSpy.mockRestore();
    });

    it('delegates a normalized state to the stock router without logging', () => {
        // Given a normalized stack state, which is what the stock router produces
        const stackRouter = StackRouter({});
        const state = stackRouter.getRehydratedState({routes: [{name: 'Home'}, {name: 'Details'}]}, CHANGE_OPTIONS);

        // When the navigator's screen list changes
        const result = getStateForRouteNamesChangeWithFallback(stackRouter, 'TestNavigator')(state, CHANGE_OPTIONS);

        // Then the result matches the stock router, so normal navigation is unchanged
        expect(result).toEqual(stackRouter.getStateForRouteNamesChange(state, CHANGE_OPTIONS));
        expect(hmmmSpy).not.toHaveBeenCalled();
    });

    it('does not crash on a state without preloadedRoutes and keeps its routes', () => {
        // Given a state that skipped normalization, so it has no preloadedRoutes; the stock router throws "Cannot read property 'filter' of undefined" for it
        const stackRouter = StackRouter({});
        const {preloadedRoutes, ...normalizedState} = stackRouter.getRehydratedState({routes: [{name: 'Home'}, {name: 'Details'}]}, CHANGE_OPTIONS);
        const state = normalizedState as StackNavigationState<ParamListBase>;
        expect(() => stackRouter.getStateForRouteNamesChange(state, CHANGE_OPTIONS)).toThrow(TypeError);

        // When the navigator's screen list changes
        const result = getStateForRouteNamesChangeWithFallback(stackRouter, 'TestNavigator')(state, CHANGE_OPTIONS);

        // Then the routes survive, preloadedRoutes is normalized, and the malformed state is logged for diagnosis
        expect(result.routes.map((route) => route.name)).toEqual(['Home', 'Details']);
        expect(result.preloadedRoutes).toEqual([]);
        expect(result.index).toBe(1);
        expect(hmmmSpy).toHaveBeenCalledTimes(1);
    });

    it('re-seeds the initial route when the state has no routes', () => {
        // Given a malformed state with neither routes nor preloadedRoutes nor an index
        const stackRouter = StackRouter({});
        const state = {key: 'stack-test', type: 'stack', stale: false, routeNames: ROUTE_NAMES} as unknown as StackNavigationState<ParamListBase>;

        // When the navigator's screen list changes
        const result = getStateForRouteNamesChangeWithFallback(stackRouter, 'TestNavigator')(state, CHANGE_OPTIONS);

        // Then the stock router re-seeds the initial route with a valid index instead of crashing the render
        expect(result.routes.map((route) => route.name)).toEqual(['Home']);
        expect(result.index).toBe(0);
        expect(result.preloadedRoutes).toEqual([]);
    });
});

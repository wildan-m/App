import type {NavigationState, PartialState} from '@react-navigation/native';

/**
 * Whether a route with the given key is anywhere in the navigation state, including nested navigators.
 */
function isRouteInState(state: NavigationState | PartialState<NavigationState> | undefined, key: string): boolean {
    return !!state?.routes.some((route) => route.key === key || isRouteInState(route.state, key));
}

export default isRouteInState;

import type {NavigationState, PartialState} from '@react-navigation/native';

/**
 * Walks down the focused route chain and returns the leaf screen name.
 */
function getFocusedLeafScreenName(state: NavigationState | PartialState<NavigationState> | undefined): string | undefined {
    if (!state?.routes?.length) {
        return undefined;
    }
    const index = state.index ?? state.routes.length - 1;
    const focused = state.routes[index];
    if (focused?.state) {
        return getFocusedLeafScreenName(focused.state);
    }
    return focused?.name;
}

export default getFocusedLeafScreenName;

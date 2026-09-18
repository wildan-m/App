import getActiveTabName from '@libs/Navigation/helpers/getActiveTabName';
import type {NavigationRoute} from '@libs/Navigation/types';

import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

import useRootNavigationState from './useRootNavigationState';

/**
 * Returns true when Home is the selected tab in the top-most TAB_NAVIGATOR.
 * Stays true when an RHP is pushed on top of Home, unlike `useIsFocused()` which becomes false because the
 * RHP is the leaf focused route. Home's cards use this so closing an RHP doesn't look like a data change.
 */
function useIsHomeTabFocused(): boolean {
    return useRootNavigationState((state) => {
        if (!state) {
            return false;
        }
        const topTabNavigator = state.routes.findLast((route) => route.name === NAVIGATORS.TAB_NAVIGATOR) as NavigationRoute | undefined;
        return getActiveTabName(topTabNavigator) === SCREENS.HOME;
    });
}

export default useIsHomeTabFocused;

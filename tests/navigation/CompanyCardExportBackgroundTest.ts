import getAdaptedStateFromPath from '@libs/Navigation/helpers/getAdaptedStateFromPath';

import NAVIGATORS from '@src/NAVIGATORS';
import type {Route} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import type {NavigationPartialRoute, NavigationState, PartialState} from '@react-navigation/native';

/**
 * Regression test for https://github.com/Expensify/App/issues/95303
 *
 * PR #94280 migrated the company-card details/export RHP screens to dynamic routes. These screens
 * are reachable from two central screens: Members (member profile -> company card -> export) and
 * Company cards. After a page refresh, `getAdaptedStateFromPath` resolved the background full-screen
 * for these RHP screens through the static `RHP_TO_WORKSPACE` inverse relation, which is 1:1 and
 * therefore collapses a multi-entry screen to a single central (Company cards). So refreshing the
 * export RHP entered from Members incorrectly showed Company cards as the background.
 *
 * The fix skips the static workspace-relation shortcut for dynamic screens (mirroring the existing
 * `!isDynamicScreen` guard on the backTo block) so the background is derived from the route's own URL.
 */

type AnyState = PartialState<NavigationState> | undefined;

function findRoute(state: AnyState, name: string): NavigationPartialRoute | undefined {
    if (!state?.routes) {
        return undefined;
    }
    for (const route of state.routes) {
        if (route.name === name) {
            return route as NavigationPartialRoute;
        }
        const nested = findRoute(route.state as AnyState, name);
        if (nested) {
            return nested;
        }
    }
    return undefined;
}

/** Returns the central (non-Initial) screen name of the WorkspaceSplitNavigator underlying the RHP. */
function getWorkspaceCentralScreen(path: string): string | undefined {
    const state = getAdaptedStateFromPath(path as Route);
    const split = findRoute(state, NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR);
    const centralRoutes = (split?.state?.routes ?? []).filter((r) => r.name !== SCREENS.WORKSPACE.INITIAL);
    return centralRoutes.at(-1)?.name;
}

const EXPORT_FROM_MEMBERS = 'workspaces/POLICY1/members/123/company-card-details/FEED1/CARD1/edit/export';
const DETAILS_FROM_MEMBERS = 'workspaces/POLICY1/members/123/company-card-details/FEED1/CARD1';
const EXPORT_FROM_COMPANY_CARDS = 'workspaces/POLICY1/company-cards/company-card-details/FEED1/CARD1/edit/export';
const DETAILS_FROM_COMPANY_CARDS = 'workspaces/POLICY1/company-cards/company-card-details/FEED1/CARD1';

describe('Company card export/details RHP background (issue 95303)', () => {
    it('keeps Members as the background when the export RHP is entered from Members', () => {
        expect(getWorkspaceCentralScreen(EXPORT_FROM_MEMBERS)).toBe(SCREENS.WORKSPACE.MEMBERS);
    });

    it('keeps Members as the background when the card-details RHP is entered from Members', () => {
        expect(getWorkspaceCentralScreen(DETAILS_FROM_MEMBERS)).toBe(SCREENS.WORKSPACE.MEMBERS);
    });

    it('keeps Company cards as the background when the export RHP is entered from Company cards', () => {
        expect(getWorkspaceCentralScreen(EXPORT_FROM_COMPANY_CARDS)).toBe(SCREENS.WORKSPACE.COMPANY_CARDS);
    });

    it('keeps Company cards as the background when the card-details RHP is entered from Company cards', () => {
        expect(getWorkspaceCentralScreen(DETAILS_FROM_COMPANY_CARDS)).toBe(SCREENS.WORKSPACE.COMPANY_CARDS);
    });
});

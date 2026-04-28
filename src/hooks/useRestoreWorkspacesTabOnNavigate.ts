import {StackActions} from '@react-navigation/native';
import {useCallback} from 'react';
import type {OnyxCollection} from 'react-native-onyx';
import {getPreservedNavigatorState} from '@libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import {isFullScreenName, isWorkspaceNavigatorRouteName} from '@libs/Navigation/helpers/isNavigatorName';
import {getWorkspacesTabStateFromSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import navigateToWorkspacesPage from '@libs/Navigation/helpers/navigateToWorkspacesPage';
import {getTabState} from '@libs/Navigation/helpers/tabNavigatorUtils';
import navigationRef from '@libs/Navigation/navigationRef';
import type {DomainSplitNavigatorParamList, WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type {Domain, Policy} from '@src/types/onyx';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';
import useResponsiveLayout from './useResponsiveLayout';
import useRootNavigationState from './useRootNavigationState';

/**
 * The Workspaces tab can show three things: the workspaces list, a specific workspace page,
 * or a specific domain page. When the user navigates away and comes back to the tab,
 * this hook ensures they return to whichever of those they had open last — not always the list.
 *
 * It resolves the last visited route from navigation state, fetches the matching policy/domain
 * from Onyx (to verify it's still accessible), and returns a callback that performs the navigation.
 */
function useRestoreWorkspacesTabOnNavigate() {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {login: currentUserLogin} = useCurrentUserPersonalDetails();

    // Find the last route the user had open in the Workspaces tab (workspace, domain, or list).
    // Priority: live nav state (root level) -> inside TabNavigator -> preserved state -> session storage.
    const routeState = useRootNavigationState((rootState) => {
        const topmostFullScreenRoute = rootState?.routes?.findLast((route) => isFullScreenName(route.name));
        if (!topmostFullScreenRoute) {
            return {};
        }

        // Detect the duplicate-TAB_NAVIGATOR situation: when the user follows a cross-tab link
        // from inside an RHP (e.g. "View transactions" inside the workspace card details RHP →
        // Search), linkTo PUSHes a fresh TAB_NAVIGATOR onto the root stack above the RHP, while
        // the original TAB_NAVIGATOR — still holding the user's deep workspace state — stays
        // mounted underneath. Tapping the Workspaces tab on the bottom bar should reveal that
        // original state. Look for an older root-level TAB_NAVIGATOR that already contains
        // workspace state and signal the callback to pop the root stack down to it instead of
        // routing through the standard navigate flow (which would push yet another stack).
        const rootRoutes = rootState?.routes ?? [];
        const topRootIndex = rootState?.index ?? rootRoutes.length - 1;
        for (let i = 0; i < topRootIndex; i++) {
            const candidate = rootRoutes.at(i);
            if (candidate?.name !== NAVIGATORS.TAB_NAVIGATOR) {
                continue;
            }
            const candidateTabState = getTabState(candidate);
            const candidateWorkspaceNavigator = candidateTabState?.routes?.find((route) => route.name === NAVIGATORS.WORKSPACE_NAVIGATOR);
            if (!candidateWorkspaceNavigator) {
                continue;
            }
            const candidateWorkspaceNavigatorState =
                candidateWorkspaceNavigator.state ?? (candidateWorkspaceNavigator.key ? getPreservedNavigatorState(candidateWorkspaceNavigator.key) : undefined);
            const hasWorkspaceState = candidateWorkspaceNavigatorState?.routes?.some((route) => isWorkspaceNavigatorRouteName(route.name)) ?? false;
            if (hasWorkspaceState) {
                return {duplicateStackPopCount: topRootIndex - i, topmostFullScreenRoute};
            }
        }

        // Look inside TabNavigator for WORKSPACE_NAVIGATOR
        const rootTabRoute = rootState?.routes.findLast((route) => route.name === NAVIGATORS.TAB_NAVIGATOR);
        const rootTabState = getTabState(rootTabRoute);
        const workspaceNavigatorRoute = rootTabState?.routes?.find((route) => route.name === NAVIGATORS.WORKSPACE_NAVIGATOR);

        if (workspaceNavigatorRoute) {
            const workspaceNavigatorState = workspaceNavigatorRoute.state ?? (workspaceNavigatorRoute.key ? getPreservedNavigatorState(workspaceNavigatorRoute.key) : undefined);
            const lastWorkspaceRoute = workspaceNavigatorState?.routes?.findLast((route) => isWorkspaceNavigatorRouteName(route.name));
            if (lastWorkspaceRoute) {
                const tabState = lastWorkspaceRoute.state ?? (lastWorkspaceRoute.key ? getPreservedNavigatorState(lastWorkspaceRoute.key) : undefined);
                return {lastWorkspacesTabNavigatorRoute: lastWorkspaceRoute, workspacesTabState: tabState, topmostFullScreenRoute};
            }
            return {topmostFullScreenRoute};
        }

        // Fall back to session storage when no route exists in the navigation tree
        const sessionRoute = getWorkspacesTabStateFromSessionStorage()
            ?.routes?.findLast((route) => route.name === NAVIGATORS.WORKSPACE_NAVIGATOR)
            ?.state?.routes?.findLast((route) => isWorkspaceNavigatorRouteName(route.name));
        if (sessionRoute) {
            return {lastWorkspacesTabNavigatorRoute: sessionRoute, workspacesTabState: sessionRoute.state};
        }

        return {topmostFullScreenRoute};
    });

    const {lastWorkspacesTabNavigatorRoute, workspacesTabState, topmostFullScreenRoute, duplicateStackPopCount} = routeState;

    // If the last route was a specific workspace or domain, extract its ID from params
    const params = workspacesTabState?.routes?.at(0)?.params as
        | WorkspaceSplitNavigatorParamList[typeof SCREENS.WORKSPACE.INITIAL]
        | DomainSplitNavigatorParamList[typeof SCREENS.DOMAIN.INITIAL];
    const paramsPolicyID = params && 'policyID' in params ? params.policyID : undefined;
    const paramsDomainAccountID = params && 'domainAccountID' in params ? params.domainAccountID : undefined;

    // Fetch the policy/domain to verify it's still accessible (not deleted/hidden) before restoring
    const lastViewedPolicySelector = useCallback(
        (policies: OnyxCollection<Policy>) => {
            if (lastWorkspacesTabNavigatorRoute?.name !== NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR || !paramsPolicyID) {
                return undefined;
            }
            return policies?.[`${ONYXKEYS.COLLECTION.POLICY}${paramsPolicyID}`];
        },
        [lastWorkspacesTabNavigatorRoute?.name, paramsPolicyID],
    );
    const [lastViewedPolicy] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: lastViewedPolicySelector});

    const lastViewedDomainSelector = useCallback(
        (domains: OnyxCollection<Domain>) => {
            if (lastWorkspacesTabNavigatorRoute?.name !== NAVIGATORS.DOMAIN_SPLIT_NAVIGATOR || !paramsDomainAccountID) {
                return undefined;
            }
            return domains?.[`${ONYXKEYS.COLLECTION.DOMAIN}${paramsDomainAccountID}`];
        },
        [lastWorkspacesTabNavigatorRoute?.name, paramsDomainAccountID],
    );
    const [lastViewedDomain] = useOnyx(ONYXKEYS.COLLECTION.DOMAIN, {selector: lastViewedDomainSelector});

    return useCallback(() => {
        if (duplicateStackPopCount && duplicateStackPopCount > 0) {
            navigationRef.dispatch(StackActions.pop(duplicateStackPopCount));
            return;
        }
        navigateToWorkspacesPage({
            shouldUseNarrowLayout,
            currentUserLogin,
            policy: lastViewedPolicy,
            domain: lastViewedDomain,
            lastWorkspacesTabNavigatorRoute,
            topmostFullScreenRoute,
        });
    }, [duplicateStackPopCount, shouldUseNarrowLayout, currentUserLogin, lastViewedPolicy, lastViewedDomain, lastWorkspacesTabNavigatorRoute, topmostFullScreenRoute]);
}

export default useRestoreWorkspacesTabOnNavigate;

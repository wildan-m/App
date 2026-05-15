import {CommonActions} from '@react-navigation/native';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import {markFullscreenPreInsertedUnderRHP} from '@libs/Navigation/Navigation';
import navigationRef from '@libs/Navigation/navigationRef';
import NAVIGATORS from '@src/NAVIGATORS';
import type SCREENS from '@src/SCREENS';

type WorkspaceTargetScreen = typeof SCREENS.WORKSPACE.PROFILE | typeof SCREENS.WORKSPACE.INITIAL;

/**
 * Pushes a freshly created workspace's split navigator into TAB_NAVIGATOR / WORKSPACE_NAVIGATOR
 * while an RHP is still on top of the root stack. The dispatch is targeted at the TAB_NAVIGATOR's
 * state key, so the RHP stays in place; once the caller dismisses it, the modal animation reveals
 * the new workspace page directly instead of briefly exposing WORKSPACES_LIST underneath.
 *
 * `initial: false` matters when WORKSPACE_NAVIGATOR has never been mounted (e.g. workspace created
 * from Inbox/Reports): it tells the stack router not to seed the stack with WORKSPACES_LIST before
 * pushing WORKSPACE_SPLIT_NAVIGATOR.
 */
function pushNewlyCreatedWorkspaceUnderActiveModal(targetScreen: WorkspaceTargetScreen, policyID: string) {
    const rootState = navigationRef.getRootState();
    const tabRoute = rootState?.routes.findLast((r) => r.name === NAVIGATORS.TAB_NAVIGATOR);
    const tabStateKey = tabRoute?.state?.key;
    if (!tabStateKey) {
        return;
    }

    navigationRef.dispatch({
        ...CommonActions.navigate({
            name: NAVIGATORS.WORKSPACE_NAVIGATOR,
            params: {
                initial: false,
                screen: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR,
                params: {
                    screen: targetScreen,
                    params: {policyID},
                },
            },
        }),
        target: tabStateKey,
    });

    // On narrow layout the caller (`createWorkspaceWithPolicyDraftAndNavigateToIt`) will
    // otherwise also call `revealRouteBeforeDismissingModal`, which dispatches
    // REPLACE_FULLSCREEN_UNDER_RHP and prepends WORKSPACES_LIST under the freshly
    // pushed WORKSPACE_SPLIT_NAVIGATOR — leaving the user with two Workspaces entries
    // in browser history. Setting the existing pre-insert flag lets the caller detect
    // the pre-mount and skip the duplicating reveal.
    if (getIsNarrowLayout()) {
        markFullscreenPreInsertedUnderRHP();
    }
}

export default pushNewlyCreatedWorkspaceUnderActiveModal;

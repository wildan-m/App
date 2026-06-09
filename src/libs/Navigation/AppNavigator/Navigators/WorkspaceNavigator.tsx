/**
 * Stack Navigator containing WorkspacesList and WorkspaceSplit screens.
 */
import React from 'react';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {TabNavigatorParamList, WorkspaceNavigatorParamList} from '@libs/Navigation/types';
import createWorkspaceNavigator from '@navigation/AppNavigator/createWorkspaceNavigator';
import DomainsListPage from '@pages/domain/DomainsListPage';
import WorkspacesListPage from '@pages/workspace/WorkspacesListPage';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import DomainSplitNavigator from './DomainSplitNavigator';
import WorkspaceSplitNavigator from './WorkspaceSplitNavigator';

const Stack = createWorkspaceNavigator<WorkspaceNavigatorParamList>();

function hasNoEnterAnimationFlag(params: unknown): boolean {
    return !!(params as {noEnterAnimation?: boolean} | undefined)?.noEnterAnimation;
}

function WorkspaceNavigator({route}: PlatformStackScreenProps<TabNavigatorParamList, typeof NAVIGATORS.WORKSPACE_NAVIGATOR>) {
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    // On narrow layout, enable swipe-back and slide in the split navigator, except when the leaf route carries
    // `noEnterAnimation` (set by handleReplaceFullscreenUnderRHP for `collapseTabToLeaf`), where it mounts instantly.
    // The flag must only suppress the enter animation — swipe-back stays enabled on narrow layout regardless.
    const buildSplitNavigatorOptions = ({route: screenRoute}: {route: {params?: unknown}}) => {
        if (!shouldUseNarrowLayout) {
            return {animation: Animations.NONE};
        }
        const animation = hasNoEnterAnimationFlag(screenRoute.params) ? Animations.NONE : Animations.SLIDE_FROM_RIGHT;
        return {animation, gestureEnabled: true};
    };

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: Animations.NONE,
            }}
            parentRoute={route}
        >
            <Stack.Screen
                name={SCREENS.WORKSPACES_LIST}
                component={WorkspacesListPage}
            />
            <Stack.Screen
                name={SCREENS.DOMAINS_LIST}
                component={DomainsListPage}
            />
            <Stack.Screen
                name={NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR}
                options={buildSplitNavigatorOptions}
                component={WorkspaceSplitNavigator}
            />
            <Stack.Screen
                name={NAVIGATORS.DOMAIN_SPLIT_NAVIGATOR}
                options={buildSplitNavigatorOptions}
                component={DomainSplitNavigator}
            />
        </Stack.Navigator>
    );
}

export default WorkspaceNavigator;

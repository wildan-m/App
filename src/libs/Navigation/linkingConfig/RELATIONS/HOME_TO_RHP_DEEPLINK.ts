import SCREENS from '@src/SCREENS';

/**
 * Deeplink-only variant of HOME_TO_RHP. Consulted ONLY when navigation state is built from a path
 * (deeplink / browser refresh / cold load) via the `isDeeplink` flag in getMatchingFullScreenRoute,
 * defining the default fullscreen under the RHP without forcing it for in-app navigation.
 *
 * The Enter signer info flow is opened from a chat as well as from the Time Sensitive section on Home,
 * so the page the user is on has to stay underneath. See https://github.com/Expensify/App/issues/100874.
 */
const HOME_TO_RHP_DEEPLINK: Record<typeof SCREENS.HOME, string[]> = {
    [SCREENS.HOME]: [SCREENS.REIMBURSEMENT_ACCOUNT_ENTER_SIGNER_INFO],
};

export default HOME_TO_RHP_DEEPLINK;

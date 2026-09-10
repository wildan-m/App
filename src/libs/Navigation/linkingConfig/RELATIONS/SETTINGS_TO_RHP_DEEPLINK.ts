import type {SettingsSplitNavigatorParamList} from '@libs/Navigation/types';

import SCREENS from '@src/SCREENS';

/**
 * Deeplink-only variant of SETTINGS_TO_RHP. Consulted ONLY when navigation state is built from a path
 * (deeplink / browser refresh / cold load) via the `isDeeplink` flag in getMatchingFullScreenRoute,
 * defining the default fullscreen under the RHP without forcing it for in-app navigation.
 *
 * These RHP screens are opened from chats, expenses and Home as well as from Settings, so the page the
 * user is on has to stay underneath. See https://github.com/Expensify/App/issues/100874.
 */
const SETTINGS_TO_RHP_DEEPLINK: Partial<Record<keyof SettingsSplitNavigatorParamList, string[]>> = {
    [SCREENS.SETTINGS.WALLET.ROOT]: [
        SCREENS.SETTINGS.ADD_US_BANK_ACCOUNT,
        SCREENS.SETTINGS.ADD_US_BANK_ACCOUNT_ENTRY_POINT,
        SCREENS.SETTINGS.WALLET.PERSONAL_CARD_DETAILS,
        SCREENS.SETTINGS.WALLET.PERSONAL_CARD_FIX_CONNECTION,
        SCREENS.SETTINGS.WALLET.PERSONAL_CARD_WARNING,
    ],
    [SCREENS.SETTINGS.ABOUT]: [SCREENS.SETTINGS.APP_DOWNLOAD_LINKS],
    [SCREENS.SETTINGS.SUBSCRIPTION.ROOT]: [SCREENS.SETTINGS.SUBSCRIPTION.ADD_PAYMENT_CARD],
};

export default SETTINGS_TO_RHP_DEEPLINK;

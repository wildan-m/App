import {RHP_TO_HOME, RHP_TO_HOME_DEEPLINK, RHP_TO_SETTINGS, RHP_TO_SETTINGS_DEEPLINK} from '@libs/Navigation/linkingConfig/RELATIONS';

import SCREENS from '@src/SCREENS';

/**
 * These RHP screens are reachable from a chat, an expense or Home as well as from Settings, so the page
 * they resolve to must only be used when the state is built from a path. Keeping them in the always-on
 * relations swapped the background page for in-app navigation.
 * See https://github.com/Expensify/App/issues/100874.
 */
describe('RHP screens with a deeplink-only background', () => {
    const settingsCases: Array<[string, string]> = [
        [SCREENS.SETTINGS.APP_DOWNLOAD_LINKS, SCREENS.SETTINGS.ABOUT],
        [SCREENS.SETTINGS.ADD_US_BANK_ACCOUNT, SCREENS.SETTINGS.WALLET.ROOT],
        [SCREENS.SETTINGS.ADD_US_BANK_ACCOUNT_ENTRY_POINT, SCREENS.SETTINGS.WALLET.ROOT],
        [SCREENS.SETTINGS.WALLET.PERSONAL_CARD_DETAILS, SCREENS.SETTINGS.WALLET.ROOT],
        [SCREENS.SETTINGS.WALLET.PERSONAL_CARD_FIX_CONNECTION, SCREENS.SETTINGS.WALLET.ROOT],
        [SCREENS.SETTINGS.WALLET.PERSONAL_CARD_WARNING, SCREENS.SETTINGS.WALLET.ROOT],
        [SCREENS.SETTINGS.SUBSCRIPTION.ADD_PAYMENT_CARD, SCREENS.SETTINGS.SUBSCRIPTION.ROOT],
    ];

    it.each(settingsCases)('resolves %s to its settings page only for deeplinks', (rhpScreen, settingsScreen) => {
        expect(RHP_TO_SETTINGS[rhpScreen]).toBeUndefined();
        expect(RHP_TO_SETTINGS_DEEPLINK[rhpScreen]).toBe(settingsScreen);
    });

    it('resolves the enter signer info flow to Home only for deeplinks', () => {
        expect(RHP_TO_HOME[SCREENS.REIMBURSEMENT_ACCOUNT_ENTER_SIGNER_INFO]).toBeUndefined();
        expect(RHP_TO_HOME_DEEPLINK[SCREENS.REIMBURSEMENT_ACCOUNT_ENTER_SIGNER_INFO]).toBe(SCREENS.HOME);
    });

    it('keeps the transaction and report screens opened from Home on the always-on relation', () => {
        expect(RHP_TO_HOME[SCREENS.RIGHT_MODAL.SEARCH_REPORT]).toBe(SCREENS.HOME);
        expect(RHP_TO_HOME[SCREENS.RIGHT_MODAL.EXPENSE_REPORT]).toBe(SCREENS.HOME);
        expect(RHP_TO_HOME[SCREENS.RIGHT_MODAL.SEARCH_MONEY_REQUEST_REPORT]).toBe(SCREENS.HOME);
    });
});

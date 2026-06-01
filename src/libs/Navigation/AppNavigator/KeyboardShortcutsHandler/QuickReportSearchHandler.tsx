import {useEffect} from 'react';
import {useSearchRouterActions} from '@components/Search/SearchRouter/SearchRouterContext';
import useShouldShowRequire2FAPage from '@hooks/useShouldShowRequire2FAPage';
import KeyboardShortcut from '@libs/KeyboardShortcut';
import Navigation from '@libs/Navigation/Navigation';
import * as Session from '@userActions/Session';
import CONST from '@src/CONST';

function QuickReportSearchHandler() {
    const {openSearchRouter} = useSearchRouterActions();
    const shouldShowRequire2FAPage = useShouldShowRequire2FAPage();

    useEffect(() => {
        const shortcutConfig = CONST.KEYBOARD_SHORTCUTS.QUICK_REPORT_SEARCH;
        // Open the cmd+K switcher pre-filled with the expense-report type filter and an empty report-id filter,
        // so the user can immediately type/paste the report ID they want to jump to.
        const initialQuery = `${CONST.SEARCH.SEARCH_USER_FRIENDLY_KEYS.TYPE}:${CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT} ${CONST.SEARCH.SEARCH_USER_FRIENDLY_KEYS.REPORT_ID}:`;
        const unsubscribe = KeyboardShortcut.subscribe(
            shortcutConfig.shortcutKey,
            () => {
                Session.callFunctionIfActionIsAllowed(() => {
                    if (Navigation.isOnboardingFlow() || shouldShowRequire2FAPage) {
                        return;
                    }
                    openSearchRouter(initialQuery);
                })();
            },
            shortcutConfig.descriptionKey,
            shortcutConfig.modifiers,
            true,
        );

        return () => unsubscribe();
        // Rule disabled because this effect is only for component did mount & will component unmount lifecycle event
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

export default QuickReportSearchHandler;

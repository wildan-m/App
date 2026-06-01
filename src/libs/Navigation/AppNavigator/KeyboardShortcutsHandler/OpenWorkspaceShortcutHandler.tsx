import {useEffect} from 'react';
import useShouldShowRequire2FAPage from '@hooks/useShouldShowRequire2FAPage';
import KeyboardShortcut from '@libs/KeyboardShortcut';
import Navigation from '@libs/Navigation/Navigation';
import {getReportOrDraftReport, isExpenseReport} from '@libs/ReportUtils';
import * as Session from '@userActions/Session';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

function OpenWorkspaceShortcutHandler() {
    const shouldShowRequire2FAPage = useShouldShowRequire2FAPage();

    useEffect(() => {
        const shortcutConfig = CONST.KEYBOARD_SHORTCUTS.OPEN_WORKSPACE;
        const unsubscribe = KeyboardShortcut.subscribe(
            shortcutConfig.shortcutKey,
            () => {
                Session.callFunctionIfActionIsAllowed(() => {
                    if (Navigation.isOnboardingFlow() || shouldShowRequire2FAPage) {
                        return;
                    }
                    // Only act when the user is viewing an expense report that belongs to a real workspace.
                    const reportID = Navigation.getTopmostReportId();
                    if (!reportID || !isExpenseReport(reportID)) {
                        return;
                    }
                    const policyID = getReportOrDraftReport(reportID)?.policyID;
                    if (!policyID || policyID === CONST.POLICY.ID_FAKE) {
                        return;
                    }
                    Navigation.navigate(ROUTES.WORKSPACE_OVERVIEW.getRoute(policyID));
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

export default OpenWorkspaceShortcutHandler;

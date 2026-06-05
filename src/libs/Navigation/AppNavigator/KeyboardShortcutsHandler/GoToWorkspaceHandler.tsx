import {useEffect, useRef} from 'react';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import KeyboardShortcut from '@libs/KeyboardShortcut';
import Navigation from '@libs/Navigation/Navigation';
import {getCurrentUserEmail} from '@libs/Network/NetworkStore';
import {isPolicyAccessible} from '@libs/PolicyUtils';
import {getReportOrDraftReport} from '@libs/ReportUtils';
import {callFunctionIfActionIsAllowed} from '@userActions/Session';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

function GoToWorkspaceHandler() {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const shouldUseNarrowLayoutRef = useRef(shouldUseNarrowLayout);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {canBeMissing: true});
    const policiesRef = useRef(policies);

    useEffect(() => {
        shouldUseNarrowLayoutRef.current = shouldUseNarrowLayout;
    }, [shouldUseNarrowLayout]);

    useEffect(() => {
        policiesRef.current = policies;
    }, [policies]);

    useEffect(() => {
        const shortcutConfig = CONST.KEYBOARD_SHORTCUTS.GO_TO_WORKSPACE;
        const unsubscribe = KeyboardShortcut.subscribe(
            shortcutConfig.shortcutKey,
            callFunctionIfActionIsAllowed(() => {
                const reportID = Navigation.getTopmostReportId();
                if (!reportID) {
                    return;
                }

                const report = getReportOrDraftReport(reportID);
                const policyID = report?.policyID ?? (report?.parentReportID ? getReportOrDraftReport(report.parentReportID)?.policyID : undefined);
                if (!policyID || policyID === CONST.POLICY.ID_FAKE) {
                    return;
                }

                // Don't navigate when the destination workspace is no longer accessible (e.g. a deleted workspace whose
                // #admins room or workspace chat is now archived). Otherwise CMD+B opens the "not here" page.
                const policy = policiesRef.current?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
                if (!isPolicyAccessible(policy, getCurrentUserEmail() ?? '')) {
                    return;
                }

                const route = shouldUseNarrowLayoutRef.current ? ROUTES.WORKSPACE_INITIAL.getRoute(policyID, Navigation.getActiveRoute()) : ROUTES.WORKSPACE_OVERVIEW.getRoute(policyID);
                Navigation.navigate(route);
            }),
            shortcutConfig.descriptionKey,
            shortcutConfig.modifiers,
            true,
        );

        return () => unsubscribe();
    }, []);

    return null;
}

export default GoToWorkspaceHandler;

import {openReport} from '@libs/actions/Report';
import {getReviewWorkspaceSettingsTaskCompletionData} from '@libs/actions/Task';
import {isSupportedPendingInviteOnboarding} from '@libs/OnboardingUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {guidedSetupAndTourStatusSelector} from '@selectors/Onboarding';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnboardingTaskInformation from './useOnboardingTaskInformation';
import useOnyx from './useOnyx';

/**
 * Returns a getter that builds the optimistic Onyx data completing the "Review your workspace settings" onboarding
 * task, to be merged into a workspace-settings write command's onyxData.
 *
 * The getter is intentionally lazy: `getReviewWorkspaceSettingsTaskCompletionData` mints a fresh optimistic
 * `reportActionID` on every call, so it must run at save time (not eagerly per render).
 *
 * An invited admin who changes a workspace setting before ever opening Concierge has no onboarding tasks yet,
 * because they are only created by the guided setup that runs inside `openReport`. In that case we run the guided
 * setup right away and ask it to create this task already completed, so the task is not recreated as incomplete
 * when the user later opens Concierge.
 */
function useReviewWorkspaceSettingsTaskCompletion() {
    const {accountID} = useCurrentUserPersonalDetails();
    const taskInformation = useOnboardingTaskInformation(CONST.ONBOARDING_TASK_TYPE.REVIEW_WORKSPACE_SETTINGS);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [conciergeChat] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`);
    const [hasConciergeReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${conciergeReportID}`, {selector: Boolean});
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [guidedSetupAndTourStatus] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: guidedSetupAndTourStatusSelector});

    return () => {
        if (!taskInformation.taskReport && conciergeReportID && isSupportedPendingInviteOnboarding(introSelected)) {
            openReport({
                reportID: conciergeReportID,
                introSelected,
                betas,
                conciergeChat,
                hasReportActions: hasConciergeReportActions,
                currentUserAccountID: accountID,
                isSelfTourViewed: guidedSetupAndTourStatus?.isSelfTourViewed,
                hasCompletedGuidedSetupFlow: guidedSetupAndTourStatus?.hasCompletedGuidedSetupFlow,
                shouldAutoCompleteReviewWorkspaceSettingsTask: true,
            });
            return {};
        }

        return getReviewWorkspaceSettingsTaskCompletionData(taskInformation, accountID);
    };
}

export default useReviewWorkspaceSettingsTaskCompletion;

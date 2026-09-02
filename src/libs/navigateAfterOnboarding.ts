import {handleRHPVariantNavigation, shouldOpenRHPVariant} from '@components/SidePanel/RHPVariantTest';

import {dismissMarketingWindow} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {OnboardingRHPVariant, ReportNameValuePairs} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import {setDisableDismissOnEscape} from './actions/Modal';
import isReportTopmostSplitNavigator from './Navigation/helpers/isReportTopmostSplitNavigator';
import {dismissOnboardingModalBeforeExit} from './Navigation/helpers/OnboardingNavigationUtils';
import shouldOpenOnAdminRoom from './Navigation/helpers/shouldOpenOnAdminRoom';
import Navigation from './Navigation/Navigation';
import {ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT} from './ProductMarketingWindowUtils';
import {findLastAccessedReport, isConciergeChatReport, isSelfDM} from './ReportUtils';
import {buildCannedSearchQuery} from './SearchQueryUtils';

let onboardingRHPVariant: OnyxEntry<OnboardingRHPVariant>;
Onyx.connectWithoutView({
    key: ONYXKEYS.NVP_ONBOARDING_RHP_VARIANT,
    callback: (value) => {
        onboardingRHPVariant = value;
    },
});

type NavigateAfterOnboardingOptions = {
    afterTransition?: () => void;
    variantOverride?: OnboardingRHPVariant | null;
};

/**
 * Determines the report ID to navigate to after onboarding for control variant or ineligible users.
 * On large screens, navigates to the admins chat if available. On small screens, finds the last
 * accessed report while avoiding self DM, Concierge chat, and reports from the onboarding policy.
 */
function getReportIDAfterOnboarding(
    isSmallScreenWidth: boolean,
    canUseDefaultRooms: boolean | undefined,
    conciergeReportID: string | undefined,
    reportNameValuePairs: OnyxCollection<ReportNameValuePairs>,
    onboardingPolicyID?: string,
    onboardingAdminsChatReportID?: string,
    shouldPreventOpenAdminRoom = false,
): string | undefined {
    // When hasCompletedGuidedSetupFlow is true, OnboardingModalNavigator in AuthScreen is removed from the navigation stack.
    // On small screens, this removal redirects navigation to HOME. Dismissing the modal doesn't work properly,
    // so we need to specifically navigate to the last accessed report.
    if (!isSmallScreenWidth) {
        if (onboardingAdminsChatReportID && !shouldPreventOpenAdminRoom) {
            return onboardingAdminsChatReportID;
        }
        return undefined;
    }

    // TODO: Pass guideAccountIDs once callers are fully migrated — PR 33 (https://github.com/Expensify/App/issues/66413); findLastAccessedReport falls back to hasExpensifyGuidesEmails → allPersonalDetails
    const lastAccessedReport = findLastAccessedReport(!canUseDefaultRooms, undefined, shouldOpenOnAdminRoom() && !shouldPreventOpenAdminRoom, undefined, reportNameValuePairs);
    const lastAccessedReportID = lastAccessedReport?.reportID;

    // When the user goes through the onboarding flow, a workspace can be created if the user selects specific options. The user should be taken to the #admins room for that workspace because it is the most natural place for them to start their experience in the app.
    // The user should never go to the self DM or the Concierge chat if a workspace was created during the onboarding flow.
    if (lastAccessedReportID && lastAccessedReport.policyID !== onboardingPolicyID && !isConciergeChatReport(lastAccessedReport, conciergeReportID) && !isSelfDM(lastAccessedReport)) {
        return lastAccessedReportID;
    }

    return undefined;
}

/**
 * A user who just signed up has never seen the active product marketing announcement, so showing them a
 * "product update" window on their very first Home view is noise. Record the announcement as dismissed on
 * their behalf when onboarding completes: they start in the same state as someone who already closed it,
 * and the next announcement (which carries a new update key) still shows normally.
 */
function dismissProductMarketingWindowAfterOnboarding() {
    if (!ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT) {
        return;
    }
    dismissMarketingWindow(ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT.updateKey);
}

function navigateAfterOnboarding(
    isSmallScreenWidth: boolean,
    canUseDefaultRooms: boolean | undefined,
    conciergeReportID: string | undefined,
    reportNameValuePairs: OnyxCollection<ReportNameValuePairs>,
    onboardingPolicyID?: string,
    onboardingAdminsChatReportID?: string,
    shouldPreventOpenAdminRoom = false,
    options?: NavigateAfterOnboardingOptions,
) {
    setDisableDismissOnEscape(false);

    // On mobile (small screen), Track workspace admins with the trackExpensesWithConcierge variant
    // should navigate directly to the Concierge DM (which contains onboarding tasks).
    // This check is outside shouldOpenRHPVariant because that function returns false on native
    // (Side Panel doesn't exist on native), but we still need to navigate to Concierge on mobile.
    const navigationOptions = options?.afterTransition ? {afterTransition: options.afterTransition} : undefined;
    const variantOverride = options?.variantOverride;
    const variant = variantOverride ?? onboardingRHPVariant;
    if (isSmallScreenWidth && variant === CONST.ONBOARDING_RHP_VARIANT.TRACK_EXPENSES_WITH_CONCIERGE) {
        Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(conciergeReportID), navigationOptions);
        return;
    }

    if (shouldOpenRHPVariant(variantOverride)) {
        handleRHPVariantNavigation(onboardingPolicyID, variantOverride, navigationOptions);
        return;
    }

    const reportID = getReportIDAfterOnboarding(
        isSmallScreenWidth,
        canUseDefaultRooms,
        conciergeReportID,
        reportNameValuePairs,
        onboardingPolicyID,
        onboardingAdminsChatReportID,
        shouldPreventOpenAdminRoom,
    );
    if (reportID) {
        Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(reportID), navigationOptions);
    } else if (!isReportTopmostSplitNavigator()) {
        // Navigate to home to trigger guard evaluation
        Navigation.navigate(ROUTES.HOME, navigationOptions);
    }
}

function navigateAfterOnboardingWithMicrotaskQueue(
    isSmallScreenWidth: boolean,
    canUseDefaultRooms: boolean | undefined,
    conciergeReportID: string | undefined,
    reportNameValuePairs: OnyxCollection<ReportNameValuePairs>,
    onboardingPolicyID?: string,
    onboardingAdminsChatReportID?: string,
    shouldPreventOpenAdminRoom = false,
    options?: NavigateAfterOnboardingOptions,
) {
    dismissProductMarketingWindowAfterOnboarding();
    dismissOnboardingModalBeforeExit();
    Navigation.setNavigationActionToMicrotaskQueue(() => {
        navigateAfterOnboarding(
            isSmallScreenWidth,
            canUseDefaultRooms,
            conciergeReportID,
            reportNameValuePairs,
            onboardingPolicyID,
            onboardingAdminsChatReportID,
            shouldPreventOpenAdminRoom,
            options,
        );
    });
}

/**
 * After creating or joining a Submit workspace during onboarding, navigate to Spend > Expenses.
 * The side panel stays closed so onboarding isn't duplicated between the main pane and the #admins
 * room; interacting with Concierge opens the panel on demand.
 */
function navigateToSubmitWorkspaceAfterOnboarding(policyID?: string) {
    setDisableDismissOnEscape(false);

    if (!policyID) {
        Navigation.navigate(ROUTES.HOME);
        return;
    }

    Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: buildCannedSearchQuery({type: CONST.SEARCH.DATA_TYPES.EXPENSE})}));
}

function navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue(policyID?: string) {
    dismissProductMarketingWindowAfterOnboarding();
    dismissOnboardingModalBeforeExit();
    Navigation.setNavigationActionToMicrotaskQueue(() => {
        navigateToSubmitWorkspaceAfterOnboarding(policyID);
    });
}

export {navigateAfterOnboarding, navigateAfterOnboardingWithMicrotaskQueue, navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue};

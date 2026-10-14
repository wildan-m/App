import {navigateAfterOnboarding, navigateAfterOnboardingWithMicrotaskQueue} from '@libs/navigateAfterOnboarding';
import dismissOnboardingModalBeforeExit from '@libs/Navigation/helpers/OnboardingNavigationUtils';
import Navigation from '@libs/Navigation/Navigation';
import type * as ReportUtils from '@libs/ReportUtils';

import initOnyxDerivedValues from '@userActions/OnyxDerived';
import SidePanelActions from '@userActions/SidePanel';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../utils/getOnyxValue';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const ONBOARDING_ADMINS_CHAT_REPORT_ID = '1';
const ONBOARDING_POLICY_ID = '2';
const REPORT_ID = '3';
const USER_ID = '4';
const mockFindLastAccessedReport = jest.fn<ReportUtils.LastAccessedReport | undefined, Parameters<typeof ReportUtils.findLastAccessedReport>>();
const mockShouldOpenOnAdminRoom = jest.fn(() => false);
const mockIsReportTopmostSplitNavigator = jest.fn(() => false);

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
        shouldUseStaging: jest.fn(),
        closeReactNativeApp: jest.fn(),
        completeOnboarding: jest.fn(),
        switchAccount: jest.fn(),
        sendAuthToken: jest.fn(),
        getHybridAppSettings: jest.fn(() => Promise.resolve(null)),
        getInitialURL: jest.fn(() => Promise.resolve(null)),
        onURLListenerAdded: jest.fn(),
        signInToOldDot: jest.fn(),
        signOutFromOldDot: jest.fn(),
        startSignOut: jest.fn(),
        cancelSignOut: jest.fn(),
        clearOldDotAfterSignOut: jest.fn(),
    },
}));

jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual<typeof Navigation>('@react-navigation/native');
    return {
        ...actualNav,
        useIsFocused: jest.fn(),
        triggerTransitionEnd: jest.fn(),
    };
});

jest.mock('@libs/ReportUtils', () => ({
    findLastAccessedReport: (...args: Parameters<typeof mockFindLastAccessedReport>) => mockFindLastAccessedReport(...args),
    parseReportRouteParams: jest.fn(() => ({})),
    isConciergeChatReport: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').isConciergeChatReport,
    isArchivedReport: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').isArchivedReport,
    isThread: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').isThread,
    getAllPolicyReports: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').getAllPolicyReports,
    isValidReport: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').isValidReport,
    generateReportAttributes: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').generateReportAttributes,
    getAllReportActionsErrorsAndReportActionThatRequiresAttention: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').getAllReportActionsErrorsAndReportActionThatRequiresAttention,
    getAllReportErrors: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').getAllReportErrors,
    getViolatingReportIDForRBRInLHN: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').getViolatingReportIDForRBRInLHN,
    generateIsEmptyReport: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').generateIsEmptyReport,
    isExpenseReport: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').isExpenseReport,
    isSelfDM: jest.requireActual<typeof ReportUtils>('@libs/ReportUtils').isSelfDM,
}));

jest.mock('@libs/Navigation/helpers/shouldOpenOnAdminRoom', () => ({
    __esModule: true,
    default: () => mockShouldOpenOnAdminRoom(),
}));

jest.mock('@libs/Navigation/helpers/OnboardingNavigationUtils', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@libs/Navigation/helpers/isReportTopmostSplitNavigator', () => ({
    __esModule: true,
    default: () => mockIsReportTopmostSplitNavigator(),
}));

// Use the web implementation of the RHP variant helpers, where the side panel exists, instead of the native no-op.
jest.mock('@components/SidePanel/RHPVariantTest', () => jest.requireActual('../../src/components/SidePanel/RHPVariantTest/index.ts'));

describe('navigateAfterOnboarding', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
        initOnyxDerivedValues();
        return waitForBatchedUpdates();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        mockIsReportTopmostSplitNavigator.mockReturnValue(false);
        return Onyx.clear();
    });

    it('should navigate to the admin room report if onboardingAdminsChatReportID is provided', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        const testSession = {email: 'realaccount@gmail.com'};

        navigateAfterOnboarding(false, true, '', {}, undefined, ONBOARDING_ADMINS_CHAT_REPORT_ID, (testSession?.email ?? '').includes('+'));
        expect(navigate).toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(ONBOARDING_ADMINS_CHAT_REPORT_ID), undefined);
    });

    it('should navigate to home if onboardingAdminsChatReportID is not provided on larger screens and no report is topmost', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');

        navigateAfterOnboarding(false, true, '', {}, undefined, undefined);
        // Without an admins chat report, we fall back to HOME to trigger guard evaluation instead of opening a report.
        expect(navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(ONBOARDING_ADMINS_CHAT_REPORT_ID));
        expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
    });

    it('should dismiss onboarding before navigating away from the final screen', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        jest.spyOn(Navigation, 'setNavigationActionToMicrotaskQueue').mockImplementation((navigationAction) => navigationAction());
        let finishDismissal: (() => void) | undefined;
        jest.mocked(dismissOnboardingModalBeforeExit).mockImplementation((afterTransition) => {
            finishDismissal = afterTransition;
        });

        navigateAfterOnboardingWithMicrotaskQueue(false, true, '', {});

        expect(dismissOnboardingModalBeforeExit).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();

        finishDismissal?.();

        expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
    });

    it('should preserve the topmost report if onboardingAdminsChatReportID is not provided on larger screens', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        mockIsReportTopmostSplitNavigator.mockReturnValue(true);

        navigateAfterOnboarding(false, true, '', {}, undefined, undefined);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('should not navigate to last accessed report if it is a concierge chat on small screens', async () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        const lastAccessedReport = {
            reportID: REPORT_ID,
            participants: {
                [CONST.ACCOUNT_ID.CONCIERGE.toString()]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
                [USER_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
            },
            reportName: 'Concierge',
            type: CONST.REPORT.TYPE.CHAT,
        };
        await Onyx.set(ONYXKEYS.CONCIERGE_REPORT_ID, REPORT_ID);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, lastAccessedReport);
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, REPORT_ID, {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID));
    });

    it('should not navigate to last accessed report if it is onboarding expense chat on small screens', () => {
        const lastAccessedReport = {reportID: REPORT_ID, policyID: ONBOARDING_POLICY_ID};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(Navigation.navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID));
    });

    it('should not navigate to last accessed report if it is selfDM chat on small screens', () => {
        const lastAccessedReport = {reportID: REPORT_ID, chatType: CONST.REPORT.CHAT_TYPE.SELF_DM};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(Navigation.navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID));
    });

    it('should navigate to last accessed report if shouldOpenOnAdminRoom is true on small screens', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        const lastAccessedReport = {reportID: REPORT_ID};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(true);

        navigateAfterOnboarding(true, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(navigate).toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID), undefined);
    });

    it('should pass reportNameValuePairs when looking up last accessed report', () => {
        const reportNameValuePairs = {[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${REPORT_ID}`]: {private_isArchived: '2024-02-01 04:56:47.233'}};
        mockFindLastAccessedReport.mockReturnValue(undefined);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, '', reportNameValuePairs, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);

        expect(mockFindLastAccessedReport).toHaveBeenCalledWith(false, undefined, false, undefined, reportNameValuePairs);
    });

    it('should navigate to Concierge room if user uses a test email', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        const lastAccessedReport = {reportID: REPORT_ID};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(true);
        const testSession = {email: 'test+account@gmail.com'};

        navigateAfterOnboarding(true, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, (testSession?.email ?? '').includes('+'));
        expect(navigate).toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID), undefined);
    });

    it('should navigate to the admin room when the inboxAdminsBespoke variant is assigned', () => {
        const navigate = jest.spyOn(Navigation, 'navigate');
        navigateAfterOnboarding(false, true, '', {}, undefined, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {variantOverride: CONST.ONBOARDING_RHP_VARIANT.INBOX_ADMINS_BESPOKE});
        expect(navigate).toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(ONBOARDING_ADMINS_CHAT_REPORT_ID), undefined);
    });

    it('should land on Home instead of the admin room for the homePageNoRHP variant', () => {
        // Given an admin whose #admins room exists, which the control and inboxAdminsBespoke arms open after onboarding
        const navigate = jest.spyOn(Navigation, 'navigate');

        // When onboarding finishes with the homePageNoRHP arm of the experiment
        navigateAfterOnboarding(false, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {variantOverride: CONST.ONBOARDING_RHP_VARIANT.HOME_PAGE_NO_RHP});

        // Then the user starts on Home, so Home's Getting started is the only onboarding surface they see
        expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
        expect(navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(ONBOARDING_ADMINS_CHAT_REPORT_ID), undefined);
    });

    it.each([CONST.ONBOARDING_COMPANY_SIZE.MICRO_SMALL, CONST.ONBOARDING_COMPANY_SIZE.SMALL, CONST.ONBOARDING_COMPANY_SIZE.LARGE])(
        'should land on Home without opening the side panel at company size %s for the homePageNoRHP variant',
        async (companySize) => {
            // Given a new account at a company size that decides whether the older RHP arms open the side panel
            const navigate = jest.spyOn(Navigation, 'navigate');
            const openSidePanel = jest.spyOn(SidePanelActions, 'openSidePanel');
            await Onyx.set(ONYXKEYS.ONBOARDING_COMPANY_SIZE, companySize);

            // When onboarding finishes with the homePageNoRHP arm
            navigateAfterOnboarding(false, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {variantOverride: CONST.ONBOARDING_RHP_VARIANT.HOME_PAGE_NO_RHP});
            await waitForBatchedUpdates();

            // Then the arm behaves the same at every company size: Home, and the side panel is never opened
            expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
            expect(openSidePanel).not.toHaveBeenCalled();
            const sidePanel = await getOnyxValue(ONYXKEYS.NVP_SIDE_PANEL);
            expect(sidePanel?.open).toBeFalsy();
            expect(sidePanel?.openNarrowScreen).toBeFalsy();
        },
    );

    it('should keep a report that is already on top for the homePageNoRHP variant', async () => {
        // Given a report is already showing, which the other paths that end on Home also leave in place
        const navigate = jest.spyOn(Navigation, 'navigate');
        const openSidePanel = jest.spyOn(SidePanelActions, 'openSidePanel');
        mockIsReportTopmostSplitNavigator.mockReturnValue(true);

        // When onboarding finishes with the homePageNoRHP arm
        navigateAfterOnboarding(false, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {variantOverride: CONST.ONBOARDING_RHP_VARIANT.HOME_PAGE_NO_RHP});
        await waitForBatchedUpdates();

        // Then the report stays where it is, and the side panel is not opened over it
        expect(navigate).not.toHaveBeenCalled();
        expect(openSidePanel).not.toHaveBeenCalled();
    });

    it('should use the stored homePageNoRHP variant when the onboarding response does not carry one', async () => {
        // Given the variant was saved to Onyx earlier and the completion response has no variant of its own
        const navigate = jest.spyOn(Navigation, 'navigate');
        await Onyx.set(ONYXKEYS.NVP_ONBOARDING_RHP_VARIANT, CONST.ONBOARDING_RHP_VARIANT.HOME_PAGE_NO_RHP);

        // When onboarding finishes without a variant override
        navigateAfterOnboarding(false, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);

        // Then the stored variant still applies and the user lands on Home rather than the admin room
        expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
        expect(navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(ONBOARDING_ADMINS_CHAT_REPORT_ID), undefined);
    });
    it.each([
        ['large', false],
        ['small', true],
    ])('should land on Home without opening the side panel on %s screens for the trackExpensesWithConcierge variant', async (_screenSize, isSmallScreenWidth) => {
        // Given a Track intent user, whose variant used to open Concierge in the side panel on large screens and the Concierge DM on small screens
        const navigate = jest.spyOn(Navigation, 'navigate');
        const openSidePanel = jest.spyOn(SidePanelActions, 'openSidePanel');
        await Onyx.set(ONYXKEYS.CONCIERGE_REPORT_ID, REPORT_ID);

        // When onboarding finishes with the trackExpensesWithConcierge variant
        navigateAfterOnboarding(isSmallScreenWidth, true, REPORT_ID, {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {
            variantOverride: CONST.ONBOARDING_RHP_VARIANT.TRACK_EXPENSES_WITH_CONCIERGE,
        });
        await waitForBatchedUpdates();

        // Then the user lands on Home, never on the Concierge DM, and the side panel stays closed
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
        expect(navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID), undefined);
        expect(openSidePanel).not.toHaveBeenCalled();
        const sidePanel = await getOnyxValue(ONYXKEYS.NVP_SIDE_PANEL);
        expect(sidePanel?.open).toBeFalsy();
        expect(sidePanel?.openNarrowScreen).toBeFalsy();
    });

    it('should keep a report that is already on top without opening the side panel for the trackExpensesWithConcierge variant', async () => {
        // Given a report is already showing
        const navigate = jest.spyOn(Navigation, 'navigate');
        const openSidePanel = jest.spyOn(SidePanelActions, 'openSidePanel');
        mockIsReportTopmostSplitNavigator.mockReturnValue(true);

        // When onboarding finishes with the trackExpensesWithConcierge variant
        navigateAfterOnboarding(false, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {
            variantOverride: CONST.ONBOARDING_RHP_VARIANT.TRACK_EXPENSES_WITH_CONCIERGE,
        });
        await waitForBatchedUpdates();

        // Then the report stays where it is, and the side panel is not opened over it
        expect(navigate).not.toHaveBeenCalled();
        expect(openSidePanel).not.toHaveBeenCalled();
    });

    it('should use the stored trackExpensesWithConcierge variant when the onboarding response does not carry one', async () => {
        // Given the Track variant was saved to Onyx earlier and the completion response has no variant of its own
        const navigate = jest.spyOn(Navigation, 'navigate');
        const openSidePanel = jest.spyOn(SidePanelActions, 'openSidePanel');
        await Onyx.set(ONYXKEYS.NVP_ONBOARDING_RHP_VARIANT, CONST.ONBOARDING_RHP_VARIANT.TRACK_EXPENSES_WITH_CONCIERGE);

        // When onboarding finishes on a small screen without a variant override
        navigateAfterOnboarding(true, true, REPORT_ID, {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        await waitForBatchedUpdates();

        // Then the stored variant still applies: Home, not the Concierge DM, and no side panel
        expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, undefined);
        expect(navigate).not.toHaveBeenCalledWith(ROUTES.REPORT_WITH_ID.getRoute(REPORT_ID), undefined);
        expect(openSidePanel).not.toHaveBeenCalled();
    });

    it.each([CONST.ONBOARDING_RHP_VARIANT.RHP_HOME_PAGE, CONST.ONBOARDING_RHP_VARIANT.RHP_ADMINS_ROOM, CONST.ONBOARDING_RHP_VARIANT.RHP_CONCIERGE_DM])(
        'should still open the side panel for micro companies in the %s arm of the Manage my team experiment',
        async (variant) => {
            // Given a micro company in one of the running experiment arms that open the side panel
            const openSidePanel = jest.spyOn(SidePanelActions, 'openSidePanel');
            await Onyx.set(ONYXKEYS.ONBOARDING_COMPANY_SIZE, CONST.ONBOARDING_COMPANY_SIZE.MICRO_SMALL);

            // When onboarding finishes with that arm
            navigateAfterOnboarding(false, true, '', {}, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, {variantOverride: variant});
            await waitForBatchedUpdates();

            // Then the experiment arm keeps its behavior and opens the side panel
            expect(openSidePanel).toHaveBeenCalledWith(true);
        },
    );
});

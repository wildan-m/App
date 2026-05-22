import type {OnyxEntry} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import {navigateAfterOnboarding} from '@libs/navigateAfterOnboarding';
import Navigation from '@libs/Navigation/Navigation';
import type * as ReportUtils from '@libs/ReportUtils';
import initOnyxDerivedValues from '@userActions/OnyxDerived';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const ONBOARDING_ADMINS_CHAT_REPORT_ID = '1';
const ONBOARDING_POLICY_ID = '2';
const REPORT_ID = '3';
const USER_ID = '4';
const mockFindLastAccessedReport = jest.fn<OnyxEntry<Report>, Parameters<typeof ReportUtils.findLastAccessedReport>>();
const mockShouldOpenOnAdminRoom = jest.fn();

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
    default: () => mockShouldOpenOnAdminRoom() as boolean,
}));

describe('navigateAfterOnboarding', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
        initOnyxDerivedValues();
        return waitForBatchedUpdates();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        // navigateAfterOnboarding dismisses the onboarding modal and opens the destination report
        // atomically. Stub the navigation primitives so we can assert on them without driving the
        // real (not-ready) navigation container.
        jest.spyOn(Navigation, 'dismissModalWithReport').mockImplementation(jest.fn());
        jest.spyOn(Navigation, 'dismissModal').mockImplementation(jest.fn());
        jest.spyOn(Navigation, 'navigate').mockImplementation(jest.fn());
        return Onyx.clear();
    });

    it('should open the admin room report if onboardingAdminsChatReportID is provided', () => {
        const testSession = {email: 'realaccount@gmail.com'};

        navigateAfterOnboarding(false, true, '', new Set(), undefined, ONBOARDING_ADMINS_CHAT_REPORT_ID, (testSession?.email ?? '').includes('+'));
        expect(Navigation.dismissModalWithReport).toHaveBeenCalledWith({reportID: ONBOARDING_ADMINS_CHAT_REPORT_ID});
    });

    it('should not open a report if onboardingAdminsChatReportID is not provided on larger screens', () => {
        navigateAfterOnboarding(false, true, '', new Set(), undefined, undefined);
        expect(Navigation.dismissModalWithReport).not.toHaveBeenCalled();
    });

    it('should not open the last accessed report if it is a concierge chat on small screens', async () => {
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

        navigateAfterOnboarding(true, true, REPORT_ID, new Set(), ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(Navigation.dismissModalWithReport).not.toHaveBeenCalledWith({reportID: REPORT_ID});
    });

    it('should not open the last accessed report if it is onboarding expense chat on small screens', () => {
        const lastAccessedReport = {reportID: REPORT_ID, policyID: ONBOARDING_POLICY_ID};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, '', new Set(), ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(Navigation.dismissModalWithReport).not.toHaveBeenCalledWith({reportID: REPORT_ID});
    });

    it('should not open the last accessed report if it is selfDM chat on small screens', () => {
        const lastAccessedReport = {reportID: REPORT_ID, chatType: CONST.REPORT.CHAT_TYPE.SELF_DM};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, '', new Set(), ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(Navigation.dismissModalWithReport).not.toHaveBeenCalledWith({reportID: REPORT_ID});
    });

    it('should open the last accessed report if shouldOpenOnAdminRoom is true on small screens', () => {
        const lastAccessedReport = {reportID: REPORT_ID};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(true);

        navigateAfterOnboarding(true, true, '', new Set(), ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);
        expect(Navigation.dismissModalWithReport).toHaveBeenCalledWith({reportID: REPORT_ID});
    });

    it('should pass archivedReportsIdSet when looking up last accessed report', () => {
        const archivedReportsIdSet = new Set<string>(['report_1']);
        mockFindLastAccessedReport.mockReturnValue(undefined);
        mockShouldOpenOnAdminRoom.mockReturnValue(false);

        navigateAfterOnboarding(true, true, '', archivedReportsIdSet, ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID);

        expect(mockFindLastAccessedReport).toHaveBeenCalledWith(false, false, undefined, archivedReportsIdSet);
    });

    it('should open the last accessed report if user uses a test email', () => {
        const lastAccessedReport = {reportID: REPORT_ID};
        mockFindLastAccessedReport.mockReturnValue(lastAccessedReport);
        mockShouldOpenOnAdminRoom.mockReturnValue(true);
        const testSession = {email: 'test+account@gmail.com'};

        navigateAfterOnboarding(true, true, '', new Set(), ONBOARDING_POLICY_ID, ONBOARDING_ADMINS_CHAT_REPORT_ID, (testSession?.email ?? '').includes('+'));
        expect(Navigation.dismissModalWithReport).toHaveBeenCalledWith({reportID: REPORT_ID});
    });

    it('should open the admin room when the inbAdminsWel variant is assigned', () => {
        navigateAfterOnboarding(false, true, '', new Set(), undefined, ONBOARDING_ADMINS_CHAT_REPORT_ID, false, CONST.ONBOARDING_RHP_VARIANT.INB_ADMINS_WEL);
        expect(Navigation.dismissModalWithReport).toHaveBeenCalledWith({reportID: ONBOARDING_ADMINS_CHAT_REPORT_ID});
    });
});

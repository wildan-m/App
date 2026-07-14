import type reportAttributesModuleDefault from '@userActions/OnyxDerived/configs/reportAttributes';
import {hasPolicyRelevantFieldChanged} from '@userActions/OnyxDerived/configs/reportAttributes';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report, ReportAttributesDerivedValue, Transaction} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import {createRandomReport} from '../utils/collections/reports';
import createRandomTransaction from '../utils/collections/transaction';

type ReportAttributesConfig = typeof reportAttributesModuleDefault;

type MockReportAttributes = {
    hasAnyViolations: boolean;
    requiresAttention: boolean;
    reportErrors: Record<string, string>;
    oneTransactionThreadReportID: string | undefined;
    actionBadge: ValueOf<typeof CONST.REPORT.ACTION_BADGE> | undefined;
    actionTargetReportActionID: string | undefined;
};

// Per-report overrides for the mocked modules below, keyed by reportID. Reports with no entry fall back to
// the neutral defaults. jest.mock factories may only reference out-of-scope variables whose names start with
// "mock", hence the prefix.
const mockReportAttributesByReportID: Record<string, MockReportAttributes> = {};
const mockRedBrickRoadByReportID: Record<string, {reason: ValueOf<typeof CONST.RBR_REASONS>; reportAction?: {reportActionID: string}}> = {};
const mockPolicyExpenseChatType: string = CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT;

jest.mock('@libs/ReportUtils', () => ({
    generateReportAttributes: jest.fn(
        ({report}: {report?: {reportID?: string}}) =>
            (report?.reportID ? mockReportAttributesByReportID[report.reportID] : undefined) ?? {
                hasAnyViolations: false,
                requiresAttention: false,
                reportErrors: {},
                oneTransactionThreadReportID: undefined,
                actionBadge: undefined,
                actionTargetReportActionID: undefined,
            },
    ),
    generateIsEmptyReport: jest.fn(() => false),
    hasVisibleReportFieldViolations: jest.fn(() => false),
    isArchivedReport: jest.fn(() => false),
    isValidReport: jest.fn(() => true),
    parseReportRouteParams: jest.fn(() => ({reportID: ''})),
    hasViolations: jest.fn(() => false),
    isOpenReport: jest.fn(() => true),
    isProcessingReport: jest.fn(() => false),
    isPolicyAdmin: jest.fn(() => false),
    isPolicyExpenseChat: jest.fn((report?: {chatType?: string}) => report?.chatType === mockPolicyExpenseChatType),
}));

jest.mock('@libs/SidebarUtils', () => ({
    __esModule: true,
    default: {
        getReasonAndReportActionThatHasRedBrickRoad: jest.fn((report?: {reportID?: string}) => (report?.reportID ? mockRedBrickRoadByReportID[report.reportID] : undefined)),
    },
}));

jest.mock('@libs/ReportNameUtils', () => ({
    computeReportName: jest.fn(() => 'Test Report'),
}));

const basePolicy: Policy = {
    id: 'policy1',
    name: 'Test Policy',
    type: CONST.POLICY.TYPE.CORPORATE,
    outputCurrency: CONST.CURRENCY.USD,
    role: CONST.POLICY.ROLE.ADMIN,
    approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
    reimbursementChoice: CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_YES,
    autoReimbursementLimit: 1000,
    autoReimbursement: {limit: 500},
} as unknown as Policy;

describe('hasPolicyRelevantFieldChanged', () => {
    describe('null / undefined edge cases', () => {
        it('returns false when both are null', () => {
            expect(hasPolicyRelevantFieldChanged(null, null)).toBe(false);
        });

        it('returns false when both are undefined', () => {
            expect(hasPolicyRelevantFieldChanged(undefined, undefined)).toBe(false);
        });

        it('returns false when both are null/undefined mix', () => {
            expect(hasPolicyRelevantFieldChanged(null, undefined)).toBe(false);
            expect(hasPolicyRelevantFieldChanged(undefined, null)).toBe(false);
        });

        it('returns true when prev is null and next has a policy', () => {
            expect(hasPolicyRelevantFieldChanged(null, basePolicy)).toBe(true);
        });

        it('returns true when next is null and prev had a policy', () => {
            expect(hasPolicyRelevantFieldChanged(basePolicy, null)).toBe(true);
        });
    });

    describe('identical policies', () => {
        it('returns false when all tracked fields are the same', () => {
            const copy = {...basePolicy};
            expect(hasPolicyRelevantFieldChanged(basePolicy, copy)).toBe(false);
        });

        it('returns false when only a non-tracked field changes', () => {
            const updated = {...basePolicy, name: 'Updated Name'} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(false);
        });
    });

    describe('tracked field changes', () => {
        it('returns true when type changes', () => {
            const updated = {...basePolicy, type: CONST.POLICY.TYPE.TEAM} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when approvalMode changes', () => {
            const updated = {...basePolicy, approvalMode: CONST.POLICY.APPROVAL_MODE.OPTIONAL} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when reimbursementChoice changes', () => {
            const updated = {...basePolicy, reimbursementChoice: CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_NO} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when autoReimbursementLimit changes', () => {
            const updated = {...basePolicy, autoReimbursementLimit: 2000} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when role changes', () => {
            const updated = {...basePolicy, role: CONST.POLICY.ROLE.USER} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when autoReimbursement.limit changes', () => {
            const updated = {...basePolicy, autoReimbursement: {limit: 999}} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when autoReimbursement goes from defined to undefined', () => {
            const updated = {...basePolicy, autoReimbursement: undefined} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(basePolicy, updated)).toBe(true);
        });

        it('returns true when autoReimbursement goes from undefined to defined', () => {
            const withoutAutoReimburse = {...basePolicy, autoReimbursement: undefined} as unknown as Policy;
            expect(hasPolicyRelevantFieldChanged(withoutAutoReimburse, basePolicy)).toBe(true);
        });
    });
});

describe('reportAttributes compute — policy change code flow', () => {
    let config: ReportAttributesConfig;

    const report1 = {
        reportID: 'r1',
        policyID: 'policy1',
        chatReportID: undefined,
        participants: {},
    } as unknown as Report;

    const report2 = {
        reportID: 'r2',
        policyID: 'policy2',
        chatReportID: undefined,
        participants: {},
    } as unknown as Report;

    const reports: OnyxCollection<Report> = {
        [`${ONYXKEYS.COLLECTION.REPORT}r1`]: report1,
        [`${ONYXKEYS.COLLECTION.REPORT}r2`]: report2,
    };

    const policy1 = {...basePolicy, id: 'policy1'} as unknown as Policy;
    const policy2 = {...basePolicy, id: 'policy2'} as unknown as Policy;

    const policies: OnyxCollection<Policy> = {
        [`${ONYXKEYS.COLLECTION.POLICY}policy1`]: policy1,
        [`${ONYXKEYS.COLLECTION.POLICY}policy2`]: policy2,
    };

    beforeEach(() => {
        jest.resetModules();

        config = (require('@userActions/OnyxDerived/configs/reportAttributes') as {default: ReportAttributesConfig}).default;
    });

    const buildArgs = (overridePolicies?: OnyxCollection<Policy>, overrideReports?: OnyxCollection<Report>, transactionsUpdate?: OnyxCollection<Transaction> | null) =>
        [
            overrideReports ?? reports, // reports
            null, // preferredLocale
            null, // transactionViolations
            null, // reportActions
            null, // reportNameValuePairs
            transactionsUpdate ?? null, // transactions
            null, // personalDetails
            null, // session
            overridePolicies ?? policies, // policies
            null, // policyTags
            null, // reportViolations
            null, // reportMetadata
        ] as unknown as Parameters<ReportAttributesConfig['compute']>[0];

    it('computes every report on a cold start (no currentValue) when policies load', () => {
        const result = config.compute(buildArgs(), {
            currentValue: undefined,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: policies as never},
        });

        expect(result?.reports).toHaveProperty('r1');
        expect(result?.reports).toHaveProperty('r2');
    });

    it('scopes the first policy load to reports referencing the loaded policies when currentValue is already populated', () => {
        // Reproduces the ReconnectApp-after-open case: attributes were already computed, then ~1k policies
        // land. Only reports whose policy actually arrived should recompute — not every report.
        const report3: Report = {...createRandomReport(12, undefined), reportID: 'r3', policyID: 'policyOther', chatReportID: undefined};
        const reportsWithUnrelated: OnyxCollection<Report> = {
            ...reports,
            [`${ONYXKEYS.COLLECTION.REPORT}r3`]: report3,
        };

        const existingValue: ReportAttributesDerivedValue = {
            reports: {
                r1: {reportName: 'Old Name 1', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                r2: {reportName: 'Old Name 2', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                r3: {reportName: 'Old Name 3', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
            locale: null,
        };

        const result = config.compute(buildArgs(policies, reportsWithUnrelated), {
            currentValue: existingValue,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: policies},
        });

        // r1/r2 reference the loaded policies → recomputed (default mock name).
        expect(result?.reports.r1?.reportName).toBe('Test Report');
        expect(result?.reports.r2?.reportName).toBe('Test Report');
        // r3 references a policy that did not load → keeps its existing value (not recomputed).
        expect(result?.reports.r3?.reportName).toBe('Old Name 3');
    });

    it('recomputes a child invoice report when only its receiver workspace policy loads', () => {
        // A B2B invoice keeps the receiver policy on the invoice room, not on the child invoice report
        // (whose own policyID is the sender). computeReportName reads the receiver policy off the room, so
        // when the receiver policy arrives in its own batch the child report must recompute too — otherwise
        // its name stays stale from when it was computed without the receiver policy present.
        const senderPolicy: Policy = {...basePolicy, id: 'senderPolicy'};
        const receiverPolicy: Policy = {...basePolicy, id: 'receiverPolicy'};

        const invoiceRoom: Report = {
            ...createRandomReport(30, CONST.REPORT.CHAT_TYPE.INVOICE),
            reportID: 'invoiceRoom',
            policyID: 'senderPolicy',
            chatReportID: undefined,
            invoiceReceiver: {type: CONST.REPORT.INVOICE_RECEIVER_TYPE.BUSINESS, policyID: 'receiverPolicy'},
        };
        const invoiceChild: Report = {...createRandomReport(31, undefined), reportID: 'invoiceChild', policyID: 'senderPolicy', chatReportID: 'invoiceRoom'};
        const invoiceReports: OnyxCollection<Report> = {
            [`${ONYXKEYS.COLLECTION.REPORT}invoiceRoom`]: invoiceRoom,
            [`${ONYXKEYS.COLLECTION.REPORT}invoiceChild`]: invoiceChild,
        };

        // Seed previousPolicies with just the sender policy, as if it arrived in an earlier batch.
        config.compute(buildArgs({[`${ONYXKEYS.COLLECTION.POLICY}senderPolicy`]: senderPolicy}, invoiceReports), {
            currentValue: undefined,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: {[`${ONYXKEYS.COLLECTION.POLICY}senderPolicy`]: senderPolicy}},
        });

        const existingValue: ReportAttributesDerivedValue = {
            reports: {
                invoiceRoom: {reportName: 'Old Room', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                invoiceChild: {reportName: 'Old Child', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
            locale: null,
        };

        // The receiver policy now arrives in its own batch.
        const bothPolicies: OnyxCollection<Policy> = {
            [`${ONYXKEYS.COLLECTION.POLICY}senderPolicy`]: senderPolicy,
            [`${ONYXKEYS.COLLECTION.POLICY}receiverPolicy`]: receiverPolicy,
        };
        const result = config.compute(buildArgs(bothPolicies, invoiceReports), {
            currentValue: existingValue,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: {[`${ONYXKEYS.COLLECTION.POLICY}receiverPolicy`]: receiverPolicy}},
        });

        // Both the room (own invoiceReceiver) and the child (receiver read from its parent room) recompute.
        expect(result?.reports.invoiceRoom?.reportName).not.toBe('Old Room');
        expect(result?.reports.invoiceChild?.reportName).not.toBe('Old Child');
    });

    it('only recomputes reports for the changed policy when a tracked field changes', () => {
        // Seed previousPolicies by doing an initial compute
        config.compute(buildArgs(), {
            currentValue: undefined,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: policies as never},
        });

        const policy1Changed = {...policy1, approvalMode: CONST.POLICY.APPROVAL_MODE.OPTIONAL} as unknown as Policy;
        const updatedPolicies: OnyxCollection<Policy> = {
            ...policies,
            [`${ONYXKEYS.COLLECTION.POLICY}policy1`]: policy1Changed,
        };

        const existingValue: ReportAttributesDerivedValue = {
            reports: {
                r1: {reportName: 'Old Name 1', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                r2: {reportName: 'Old Name 2', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
            locale: null,
        };

        const computeReportNameMock = (jest.requireMock('@libs/ReportNameUtils') as unknown as {computeReportName: jest.Mock}).computeReportName;
        computeReportNameMock.mockReturnValue('New Name');

        const result = config.compute(buildArgs(updatedPolicies), {
            currentValue: existingValue,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: {[`${ONYXKEYS.COLLECTION.POLICY}policy1`]: policy1Changed} as never},
        });

        // r1 (policy1 changed) should be recomputed with new name
        expect(result?.reports.r1?.reportName).toBe('New Name');
        // r2 (policy2 unchanged) should keep its value from currentValue
        expect(result?.reports.r2?.reportName).toBe('Old Name 2');
    });

    it('skips recompute when a non-tracked policy field changes', () => {
        // Seed previousPolicies
        config.compute(buildArgs(), {
            currentValue: undefined,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: policies as never},
        });

        const policy1WithNameChange = {...policy1, name: 'New Policy Name'} as unknown as Policy;
        const updatedPolicies: OnyxCollection<Policy> = {
            ...policies,
            [`${ONYXKEYS.COLLECTION.POLICY}policy1`]: policy1WithNameChange,
        };

        const existingValue: ReportAttributesDerivedValue = {
            reports: {
                r1: {reportName: 'Existing r1', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                r2: {reportName: 'Existing r2', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
            locale: null,
        };

        const result = config.compute(buildArgs(updatedPolicies), {
            currentValue: existingValue,
            sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: {[`${ONYXKEYS.COLLECTION.POLICY}policy1`]: policy1WithNameChange} as never},
        });

        // No tracked fields changed → return currentValue unchanged
        expect(result).toEqual(existingValue);
    });

    it('recomputes the parent workspace chat when a transaction on its expense report changes', () => {
        const expenseReport: Report = {...createRandomReport(10, undefined), reportID: 'expense1', policyID: 'policy3', chatReportID: 'chat1'};
        const chatReport: Report = {...createRandomReport(11, CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT), reportID: 'chat1', policyID: 'policy3', chatReportID: undefined};
        const reportsWithChat: OnyxCollection<Report> = {
            ...reports,
            [`${ONYXKEYS.COLLECTION.REPORT}expense1`]: expenseReport,
            [`${ONYXKEYS.COLLECTION.REPORT}chat1`]: chatReport,
        };

        // Seed both entries with sentinel names; the mocked computeReportName returns 'Test Report' on any recompute.
        const existingValue: ReportAttributesDerivedValue = {
            reports: {
                expense1: {reportName: 'Old expense name', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                chat1: {reportName: 'Old chat name', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
            locale: null,
        };

        const transactionsUpdate: OnyxCollection<Transaction> = {
            [`${ONYXKEYS.COLLECTION.TRANSACTION}tx1`]: {...createRandomTransaction(1), transactionID: 'tx1', reportID: 'expense1'},
        };

        const args = buildArgs(undefined, reportsWithChat, transactionsUpdate);
        const result = config.compute(args, {
            currentValue: existingValue,
            sourceValues: {[ONYXKEYS.COLLECTION.TRANSACTION]: transactionsUpdate},
        });

        // The expense report is recomputed, and its parent workspace chat (where the to-do/GBR render) is too,
        // so both pick up the recomputed name instead of keeping their stale seeded value.
        expect(result?.reports.expense1?.reportName).toBe('Test Report');
        expect(result?.reports.chat1?.reportName).toBe('Test Report');
    });

    describe('submit-ready expense that failed to reach the server', () => {
        const failedExpenseReport: Report = {
            ...createRandomReport(20, undefined),
            reportID: 'expenseWithError',
            policyID: 'policy1',
            chatReportID: 'wsChat',
            type: CONST.REPORT.TYPE.EXPENSE,
        };

        const workspaceChat: Report = {
            ...createRandomReport(21, CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT),
            reportID: 'wsChat',
            policyID: 'policy1',
            chatReportID: undefined,
            isOwnPolicyExpenseChat: true,
        };

        const reportsWithFailedExpense: OnyxCollection<Report> = {
            [`${ONYXKEYS.COLLECTION.REPORT}expenseWithError`]: failedExpenseReport,
            [`${ONYXKEYS.COLLECTION.REPORT}wsChat`]: workspaceChat,
        };

        // A just-created expense is still open and owned by the user, so it is "ready to submit" and gets the
        // green Submit badge — while its report actions carry the errors from the request that failed.
        const setUpSubmitReadyExpense = (reason: ValueOf<typeof CONST.RBR_REASONS>) => {
            mockReportAttributesByReportID.expenseWithError = {
                hasAnyViolations: reason !== CONST.RBR_REASONS.HAS_ERRORS,
                requiresAttention: true,
                reportErrors: reason === CONST.RBR_REASONS.HAS_ERRORS ? {error1: 'Request failed'} : {},
                oneTransactionThreadReportID: undefined,
                actionBadge: CONST.REPORT.ACTION_BADGE.SUBMIT,
                actionTargetReportActionID: 'previewAction',
            };
            mockRedBrickRoadByReportID.expenseWithError = {reason, reportAction: {reportActionID: 'erroredAction'}};
        };

        const computeWithFailedExpense = () =>
            config.compute(buildArgs(undefined, reportsWithFailedExpense), {
                currentValue: undefined,
                sourceValues: {[ONYXKEYS.COLLECTION.POLICY]: policies},
            });

        afterEach(() => {
            delete mockReportAttributesByReportID.expenseWithError;
            delete mockRedBrickRoadByReportID.expenseWithError;
        });

        it('marks the workspace chat with the Fix badge when a submit-ready expense has request errors', () => {
            setUpSubmitReadyExpense(CONST.RBR_REASONS.HAS_ERRORS);

            const result = computeWithFailedExpense();

            // The expense never reached the server, so the user cannot submit past it: the workspace chat must
            // surface Fix (pointing at the expense that needs attention) rather than the green Submit badge.
            expect(result?.reports.expenseWithError?.needsParentChatErrorPropagation).toBe(true);
            expect(result?.reports.wsChat?.brickRoadStatus).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR);
            expect(result?.reports.wsChat?.actionBadge).toBe(CONST.REPORT.ACTION_BADGE.FIX);
        });

        it('keeps the green Submit badge when a submit-ready expense only has violations', () => {
            setUpSubmitReadyExpense(CONST.RBR_REASONS.HAS_VIOLATIONS);

            const result = computeWithFailedExpense();

            // A violation can still be submitted past, so the green Submit badge keeps winning and the chat is
            // not blocked with Fix — the behaviour the green-Submit override exists for.
            expect(result?.reports.expenseWithError?.needsParentChatErrorPropagation).toBe(false);
            expect(result?.reports.expenseWithError?.actionBadge).toBe(CONST.REPORT.ACTION_BADGE.SUBMIT);
            expect(result?.reports.wsChat?.actionBadge).not.toBe(CONST.REPORT.ACTION_BADGE.FIX);
        });
    });
});

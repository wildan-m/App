import {canUserExportReport, getPolicyExporterLogin, isPolicyExporter, isReportAwaitingExport, isReportInExportTodo} from '@libs/ReportExportUtils';
import {isExportAction} from '@libs/ReportPrimaryActionUtils';
import {getReportAccountingExportActions} from '@libs/ReportSecondaryActionUtils';
import {getActions, getSuggestedSearchesVisibility} from '@libs/SearchUIUtils';
import createTodosReportsAndTransactions from '@libs/TodosUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report, SearchResults} from '@src/types/onyx';
import type {ConnectionName} from '@src/types/onyx/Policy';

import Onyx from 'react-native-onyx';

import createMock from '../utils/createMock';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_EMAIL = 'exporter@mail.com';
const OTHER_USER_ACCOUNT_ID = 2;
const OTHER_USER_EMAIL = 'someone.else@mail.com';
const POLICY_ID = 'policy_export';
const REPORT_ID = 'report_export';

// Every integration that keeps a preferred exporter on its connection config.
const CONNECTIONS_WITH_EXPORTER: ConnectionName[] = [
    CONST.POLICY.CONNECTIONS.NAME.QBO,
    CONST.POLICY.CONNECTIONS.NAME.QBD,
    CONST.POLICY.CONNECTIONS.NAME.XERO,
    CONST.POLICY.CONNECTIONS.NAME.NETSUITE,
    CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT,
    CONST.POLICY.CONNECTIONS.NAME.RILLET,
    CONST.POLICY.CONNECTIONS.NAME.DUALENTRY,
    CONST.POLICY.CONNECTIONS.NAME.CAMPFIRE,
];

type PolicyOptions = {
    connectionName?: ConnectionName;
    policyExporter?: string;
    connectionExporter?: string;
    autoSyncEnabled?: boolean;
    role?: Policy['role'];
};

// NetSuite keeps its exporter under `options.config`, every other integration under `config.export`.
const createConnection = (connectionName: ConnectionName, connectionExporter: string | undefined, autoSyncEnabled: boolean) => {
    const autoSync = {jobID: 'job123', enabled: autoSyncEnabled};
    if (connectionName === CONST.POLICY.CONNECTIONS.NAME.NETSUITE) {
        return {verified: true, options: {config: {exporter: connectionExporter, autoSync}}, config: {autoSync}};
    }
    return {
        lastSync: {isConnected: true, isSuccessful: true, isAuthenticationError: false, source: 'DIRECT'},
        config: {autoSync, export: {exporter: connectionExporter}},
    };
};

const createPolicy = ({
    connectionName = CONST.POLICY.CONNECTIONS.NAME.QBO,
    policyExporter = '',
    connectionExporter = CURRENT_USER_EMAIL,
    autoSyncEnabled = false,
    role = CONST.POLICY.ROLE.ADMIN,
}: PolicyOptions = {}): Policy =>
    createMock<Policy>({
        id: POLICY_ID,
        name: 'Export Policy',
        type: CONST.POLICY.TYPE.CORPORATE,
        role,
        owner: OTHER_USER_EMAIL,
        outputCurrency: 'USD',
        approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
        exporter: policyExporter,
        connections: {[connectionName]: createConnection(connectionName, connectionExporter, autoSyncEnabled)},
    });

// An approved and paid expense report that was never exported - the shape the backend returns for `action:export`.
const createReport = (overrides: Partial<Report> = {}): Report => ({
    reportID: REPORT_ID,
    chatReportID: `chat_${REPORT_ID}`,
    policyID: POLICY_ID,
    type: CONST.REPORT.TYPE.EXPENSE,
    ownerAccountID: OTHER_USER_ACCOUNT_ID,
    managerID: CURRENT_USER_ACCOUNT_ID,
    stateNum: CONST.REPORT.STATE_NUM.APPROVED,
    statusNum: CONST.REPORT.STATUS_NUM.REIMBURSED,
    currency: 'USD',
    total: -100,
    isWaitingOnBankAccount: false,
    ...overrides,
});

/** Runs the same report through all four places App decides whether the user should export it. */
const getExportDecisions = (report: Report, policy: Policy) => {
    const {reportsToExport} = createTodosReportsAndTransactions({
        allReports: {[`${ONYXKEYS.COLLECTION.REPORT}${report.reportID}`]: report},
        allTransactions: undefined,
        allPolicies: {[`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`]: policy},
        allReportNameValuePairs: undefined,
        allReportActions: undefined,
        allReportMetadata: undefined,
        personalDetailsList: undefined,
        bankAccountList: undefined,
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        login: CURRENT_USER_EMAIL,
        areTransactionsLoaded: true,
        rules: undefined,
    });
    const searchData = createMock<SearchResults['data']>({
        [`${ONYXKEYS.COLLECTION.REPORT}${report.reportID}`]: report,
        [`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`]: policy,
    });

    return {
        homeTodo: reportsToExport.some((todoReport) => todoReport.reportID === report.reportID),
        sidebarItem: getSuggestedSearchesVisibility(CURRENT_USER_EMAIL, {}, {[`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`]: policy}, undefined).visibility[CONST.SEARCH.SEARCH_KEYS.EXPORT],
        searchRowAction: getActions(
            searchData,
            {},
            `${ONYXKEYS.COLLECTION.REPORT}${report.reportID}`,
            CONST.SEARCH.SEARCH_KEYS.EXPENSES,
            CURRENT_USER_EMAIL,
            CURRENT_USER_ACCOUNT_ID,
            {},
            undefined,
            undefined,
        ).includes(CONST.SEARCH.ACTION_TYPES.EXPORT_TO_ACCOUNTING),
        reportPrimaryAction: isExportAction(report, CURRENT_USER_EMAIL, policy, []),
        reportSecondaryAction: getReportAccountingExportActions(CURRENT_USER_ACCOUNT_ID, CURRENT_USER_EMAIL, report, {}, policy).includes(CONST.REPORT.EXPORT_OPTIONS.EXPORT_TO_INTEGRATION),
    };
};

describe('ReportExportUtils', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.SESSION, {email: CURRENT_USER_EMAIL, accountID: CURRENT_USER_ACCOUNT_ID});
        await waitForBatchedUpdates();
    });

    describe('isPolicyExporter', () => {
        it('is true when policy.exporter is the user', () => {
            const policy = createPolicy({policyExporter: CURRENT_USER_EMAIL, connectionExporter: OTHER_USER_EMAIL});
            expect(getPolicyExporterLogin(policy)).toBe(CURRENT_USER_EMAIL);
            expect(isPolicyExporter(policy, CURRENT_USER_EMAIL)).toBe(true);
        });

        it('is false when policy.exporter is someone else, even if the connection exporter is the user', () => {
            const policy = createPolicy({policyExporter: OTHER_USER_EMAIL, connectionExporter: CURRENT_USER_EMAIL});
            expect(isPolicyExporter(policy, CURRENT_USER_EMAIL)).toBe(false);
        });

        it.each(CONNECTIONS_WITH_EXPORTER)('falls back to the %s connection exporter when policy.exporter is empty', (connectionName) => {
            const policy = createPolicy({connectionName, policyExporter: '', connectionExporter: CURRENT_USER_EMAIL});
            expect(getPolicyExporterLogin(policy)).toBe(CURRENT_USER_EMAIL);
            expect(isPolicyExporter(policy, CURRENT_USER_EMAIL)).toBe(true);
        });

        it('is false when neither policy.exporter nor the connection exporter is set', () => {
            const policy = createPolicy({policyExporter: '', connectionExporter: ''});
            expect(isPolicyExporter(policy, CURRENT_USER_EMAIL)).toBe(false);
        });

        it('is false for an empty login', () => {
            const policy = createPolicy({policyExporter: '', connectionExporter: ''});
            expect(isPolicyExporter(policy, '')).toBe(false);
        });
    });

    describe('isReportInExportTodo', () => {
        it('includes a report when policy.exporter is the user', () => {
            expect(isReportInExportTodo(createReport(), createPolicy({policyExporter: CURRENT_USER_EMAIL}), CURRENT_USER_EMAIL)).toBe(true);
        });

        it('excludes a report when policy.exporter is someone else', () => {
            expect(isReportInExportTodo(createReport(), createPolicy({policyExporter: OTHER_USER_EMAIL}), CURRENT_USER_EMAIL)).toBe(false);
        });

        it.each(CONNECTIONS_WITH_EXPORTER)('includes a report when policy.exporter is empty and the %s connection exporter is the user', (connectionName) => {
            const policy = createPolicy({connectionName, policyExporter: '', connectionExporter: CURRENT_USER_EMAIL});
            expect(isReportInExportTodo(createReport(), policy, CURRENT_USER_EMAIL)).toBe(true);
        });

        it.each([true, false])('includes an unexported report when auto-sync is %s', (autoSyncEnabled) => {
            expect(isReportInExportTodo(createReport(), createPolicy({autoSyncEnabled}), CURRENT_USER_EMAIL)).toBe(true);
        });

        it('excludes a report that was already exported', () => {
            expect(isReportInExportTodo(createReport({isExportedToIntegration: true}), createPolicy(), CURRENT_USER_EMAIL)).toBe(false);
        });

        it.each([true, false])('includes a report with an export error when auto-sync is %s', (autoSyncEnabled) => {
            expect(isReportInExportTodo(createReport({hasExportError: true}), createPolicy({autoSyncEnabled}), CURRENT_USER_EMAIL)).toBe(true);
        });

        it('includes a report for a non-admin designated exporter', () => {
            expect(isReportInExportTodo(createReport(), createPolicy({role: CONST.POLICY.ROLE.USER}), CURRENT_USER_EMAIL)).toBe(true);
        });

        it('excludes a report for an admin who is not the designated exporter', () => {
            const policy = createPolicy({role: CONST.POLICY.ROLE.ADMIN, connectionExporter: OTHER_USER_EMAIL});
            expect(isReportInExportTodo(createReport(), policy, CURRENT_USER_EMAIL)).toBe(false);
        });

        it('excludes a report that is not finished yet', () => {
            const report = createReport({stateNum: CONST.REPORT.STATE_NUM.SUBMITTED, statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED});
            expect(isReportInExportTodo(report, createPolicy(), CURRENT_USER_EMAIL)).toBe(false);
        });

        it('excludes a report waiting on a bank account', () => {
            expect(isReportInExportTodo(createReport({isWaitingOnBankAccount: true}), createPolicy(), CURRENT_USER_EMAIL)).toBe(false);
        });

        it('excludes invoice reports', () => {
            expect(isReportInExportTodo(createReport({type: CONST.REPORT.TYPE.INVOICE}), createPolicy(), CURRENT_USER_EMAIL)).toBe(false);
        });

        it('excludes reports on a workspace without an accounting connection', () => {
            const policy = createMock<Policy>({...createPolicy(), connections: {}});
            expect(isReportInExportTodo(createReport(), policy, CURRENT_USER_EMAIL)).toBe(false);
        });
    });

    describe('isReportAwaitingExport and canUserExportReport', () => {
        it('lets an admin who is not the exporter export, without putting the report in their to-do', () => {
            const policy = createPolicy({role: CONST.POLICY.ROLE.ADMIN, connectionExporter: OTHER_USER_EMAIL});
            expect(canUserExportReport(createReport(), policy, CURRENT_USER_EMAIL)).toBe(true);
            expect(isReportAwaitingExport(createReport(), policy, CURRENT_USER_EMAIL)).toBe(true);
        });

        it('does not let a non-admin who is not the exporter export', () => {
            const policy = createPolicy({role: CONST.POLICY.ROLE.USER, connectionExporter: OTHER_USER_EMAIL});
            expect(canUserExportReport(createReport(), policy, CURRENT_USER_EMAIL)).toBe(false);
            expect(isReportAwaitingExport(createReport(), policy, CURRENT_USER_EMAIL)).toBe(false);
        });

        it('still allows re-exporting an exported report, but it is no longer awaiting export', () => {
            const report = createReport({isExportedToIntegration: true});
            expect(canUserExportReport(report, createPolicy(), CURRENT_USER_EMAIL)).toBe(true);
            expect(isReportAwaitingExport(report, createPolicy(), CURRENT_USER_EMAIL)).toBe(false);
        });
    });

    describe('every place App decides whether to export a report agrees', () => {
        const scenarios: Array<{name: string; report: Report; policy: Policy; expected: boolean}> = [
            ...CONNECTIONS_WITH_EXPORTER.flatMap((connectionName) =>
                [true, false].map((autoSyncEnabled) => ({
                    name: `${connectionName} connection exporter, empty policy.exporter, auto-sync ${autoSyncEnabled ? 'on' : 'off'}`,
                    report: createReport(),
                    policy: createPolicy({connectionName, policyExporter: '', connectionExporter: CURRENT_USER_EMAIL, autoSyncEnabled}),
                    expected: true,
                })),
            ),
            {name: 'policy.exporter is the user', report: createReport(), policy: createPolicy({policyExporter: CURRENT_USER_EMAIL}), expected: true},
            {name: 'non-admin designated exporter', report: createReport(), policy: createPolicy({role: CONST.POLICY.ROLE.USER}), expected: true},
            {name: 'report with an export error, auto-sync on', report: createReport({hasExportError: true}), policy: createPolicy({autoSyncEnabled: true}), expected: true},
            {name: 'report already exported', report: createReport({isExportedToIntegration: true}), policy: createPolicy(), expected: false},
            {
                name: 'non-admin who is not the exporter',
                report: createReport(),
                policy: createPolicy({role: CONST.POLICY.ROLE.USER, policyExporter: OTHER_USER_EMAIL, connectionExporter: OTHER_USER_EMAIL}),
                expected: false,
            },
        ];

        it.each(scenarios)('$name', ({report, policy, expected}) => {
            const decisions = getExportDecisions(report, policy);

            expect(decisions.homeTodo).toBe(expected);
            expect(decisions.searchRowAction).toBe(expected);
            expect(decisions.reportPrimaryAction).toBe(expected);
            // The sidebar item and the More menu only depend on who the user is, not on whether this report was exported yet.
            expect(decisions.sidebarItem).toBe(isPolicyExporter(policy, CURRENT_USER_EMAIL));
            expect(decisions.reportSecondaryAction).toBe(canUserExportReport(report, policy, CURRENT_USER_EMAIL));
            if (expected) {
                expect(decisions.sidebarItem).toBe(true);
                expect(decisions.reportSecondaryAction).toBe(true);
            }
        });
    });
});

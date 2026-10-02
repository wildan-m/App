import CONST from '@src/CONST';
import type {Policy, Report, ReportAction, ReportActions} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {canMemberWrite, getConnectionExporters, getValidConnectedIntegration, isPreferredExporter} from './PolicyUtils';
import {isClosedReport, isExpenseReport, isExported, isInvoiceReport, isReportApproved, isSettled} from './ReportUtils';

/**
 * Returns the login of the workspace's designated exporter: `policy.exporter` when it's set, otherwise the
 * exporter configured on the accounting connection (e.g. QuickBooks keeps it only in its export config).
 */
function getPolicyExporterLogin(policy: OnyxEntry<Policy>): string | undefined {
    if (policy?.exporter) {
        return policy.exporter;
    }
    return getConnectionExporters(policy).find((exporter) => !!exporter);
}

/**
 * Whether the user is the workspace's designated exporter - the person whose Export to-do a report lands in.
 */
function isPolicyExporter(policy: OnyxEntry<Policy>, login: string | undefined): boolean {
    return !!login && getPolicyExporterLogin(policy) === login;
}

/**
 * Whether the user is allowed to export the report to the workspace's accounting integration.
 * Doesn't look at whether the report was already exported, so it also covers re-exporting.
 */
function canUserExportReport(report: Report, policy: OnyxEntry<Policy>, login: string): boolean {
    if (!policy || !getValidConnectedIntegration(policy)) {
        return false;
    }

    // We don't allow export to accounting for invoice reports in OD so we want to align with that here.
    if (isInvoiceReport(report) || !isExpenseReport(report)) {
        return false;
    }

    const isReportFinished = isReportApproved({report}) || isClosedReport(report) || isSettled(report) || report.statusNum === CONST.REPORT.STATUS_NUM.REIMBURSED;
    if (!isReportFinished) {
        return false;
    }

    const hasAccountingExportPermission =
        policy.role === CONST.POLICY.ROLE.ADMIN ||
        canMemberWrite(policy, login, CONST.POLICY.POLICY_FEATURE.ACCOUNTING) ||
        canMemberWrite(policy, login, CONST.POLICY.POLICY_FEATURE.WORKFLOWS_PAYMENTS);

    return hasAccountingExportPermission || isPreferredExporter(policy, login) || isPolicyExporter(policy, login);
}

/**
 * Whether the report still needs to be exported by the user. Auto-sync doesn't exclude a report: a finished report
 * that was never exported still needs a manual export, which is what the backend returns for `action:export`.
 * Reports with an export error stay in, exported reports drop out.
 */
function isReportAwaitingExport(report: Report, policy: OnyxEntry<Policy>, login: string, reportActions?: OnyxEntry<ReportActions> | ReportAction[]): boolean {
    if (!canUserExportReport(report, policy, login)) {
        return false;
    }

    if (isExported(reportActions, report)) {
        return false;
    }

    return !report.isWaitingOnBankAccount;
}

/**
 * Whether the report belongs in the user's Export to-do - awaiting export, and the user is the workspace's designated exporter.
 */
function isReportInExportTodo(report: Report, policy: OnyxEntry<Policy>, login: string, reportActions?: OnyxEntry<ReportActions> | ReportAction[]): boolean {
    return isPolicyExporter(policy, login) && isReportAwaitingExport(report, policy, login, reportActions);
}

export {canUserExportReport, getPolicyExporterLogin, isPolicyExporter, isReportAwaitingExport, isReportInExportTodo};

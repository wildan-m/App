import CONST from '@src/CONST';
import type {PersonalDetailsList, Policy, Report, ReportAction, Rule} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import {getLoginByAccountID, getPersonalDetailByEmail} from './PersonalDetailsUtils';
import {getReimburserAccountID} from './PolicyUtils';
import {getOriginalMessage} from './ReportActionMessageUtils';
import {getSortedReportActions} from './ReportActionsUtils';
import {isActionOfType, isMoneyRequestAction} from './ReportActionTypeGuards';
import {getApprovalChain, isReportApproved, isSettled} from './ReportUtils';

const REPORT_HISTORY_STEP = {
    CREATED: 'created',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REROUTED: 'rerouted',
    HELD: 'held',
    PAID: 'paid',
    TO_APPROVE: 'toApprove',
    TO_PAY: 'toPay',
} as const;

type ReportHistoryStepType = ValueOf<typeof REPORT_HISTORY_STEP>;

type ReportHistoryEntry = {
    /** Unique key for list rendering */
    key: string;

    /** Which workflow step this entry represents */
    type: ReportHistoryStepType;

    /** The member who performed (or will perform) the step */
    accountID: number | undefined;

    /** When the step happened; absent for future steps */
    created?: string;

    /** Whether the step has not happened yet */
    isFuture: boolean;
};

/**
 * Builds the report timeline shown in the Report history RHP: the completed workflow steps
 * (created, submitted, approved, rerouted approval, held, paid) taken from the report's actions,
 * followed by the projected future steps (remaining approvers and the payer).
 */
function buildReportHistoryEntries(
    report: OnyxEntry<Report>,
    reportActions: ReportAction[],
    policy: OnyxEntry<Policy>,
    rules: OnyxCollection<Rule>,
    personalDetails: OnyxEntry<PersonalDetailsList>,
): ReportHistoryEntry[] {
    const entries: ReportHistoryEntry[] = [];
    const sortedActions = getSortedReportActions([...reportActions]);
    const approvedAccountIDs = new Set<number>();

    for (const action of sortedActions) {
        const accountID = action.actorAccountID;
        if (isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.CREATED)) {
            // Prefer the report owner: the CREATED action's actor can be an account without personal details (e.g. an old or system account)
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.CREATED, accountID: report?.ownerAccountID ?? accountID, created: action.created, isFuture: false});
        } else if (isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.SUBMITTED) || isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.SUBMITTED_AND_CLOSED)) {
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.SUBMITTED, accountID, created: action.created, isFuture: false});
        } else if (isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.APPROVED)) {
            if (accountID) {
                approvedAccountIDs.add(accountID);
            }
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.APPROVED, accountID, created: action.created, isFuture: false});
        } else if (isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.FORWARDED) || isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.REROUTE)) {
            // The actor handed the approval off to someone else, so they no longer appear as a future approver
            if (accountID) {
                approvedAccountIDs.add(accountID);
            }
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.REROUTED, accountID, created: action.created, isFuture: false});
        } else if (isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.HOLD)) {
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.HELD, accountID, created: action.created, isFuture: false});
        } else if (isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.REIMBURSED)) {
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.PAID, accountID, created: action.created, isFuture: false});
        } else if (isMoneyRequestAction(action) && getOriginalMessage(action)?.type === CONST.IOU.REPORT_ACTION_TYPE.PAY) {
            entries.push({key: action.reportActionID, type: REPORT_HISTORY_STEP.PAID, accountID, created: action.created, isFuture: false});
        }
    }

    // A settled report has no remaining steps
    if (isSettled(report)) {
        return entries;
    }

    if (!isReportApproved({report})) {
        const ownerLogin = getLoginByAccountID(report?.ownerAccountID, personalDetails);
        const approvalChain = getApprovalChain(policy, report, ownerLogin, rules);
        for (const approverEmail of approvalChain) {
            const approverAccountID = getPersonalDetailByEmail(approverEmail)?.accountID;
            if (approverAccountID && approvedAccountIDs.has(approverAccountID)) {
                continue;
            }
            entries.push({key: `${REPORT_HISTORY_STEP.TO_APPROVE}-${approverEmail}`, type: REPORT_HISTORY_STEP.TO_APPROVE, accountID: approverAccountID, isFuture: true});
        }
    }

    const reimburserAccountID = getReimburserAccountID(policy);
    if (reimburserAccountID > 0) {
        entries.push({key: REPORT_HISTORY_STEP.TO_PAY, type: REPORT_HISTORY_STEP.TO_PAY, accountID: reimburserAccountID, isFuture: true});
    }

    return entries;
}

export {buildReportHistoryEntries, REPORT_HISTORY_STEP};
export type {ReportHistoryEntry, ReportHistoryStepType};

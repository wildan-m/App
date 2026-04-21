import type {LocaleContextProps} from '@components/LocaleContextProvider';
import {getDisplayNameOrDefault, getPersonalDetailByEmail} from '@libs/PersonalDetailsUtils';
import {getIntegrationLastSuccessfulDate} from '@libs/PolicyUtils';
import type {TranslationPaths} from '@src/languages/types';
import ROUTES from '@src/ROUTES';
import type {Policy, PolicyConnectionSyncProgress} from '@src/types/onyx';
import type {HRSettingRow} from './types';

function getGustoApprovalModeLabel(policy: Policy | undefined, translate: LocaleContextProps['translate']) {
    const approvalMode = policy?.connections?.gusto?.config?.approvalMode;

    if (!approvalMode) {
        return translate('workspace.hr.gusto.notConfigured');
    }

    return translate(`workspace.hr.gusto.approvalModes.${approvalMode}` as TranslationPaths);
}

function getGustoFinalApproverDisplayName(policy: Policy | undefined, translate: LocaleContextProps['translate']) {
    const finalApprover = policy?.connections?.gusto?.config?.finalApprover;

    if (!finalApprover) {
        return translate('workspace.hr.gusto.notConfigured');
    }

    return getDisplayNameOrDefault(getPersonalDetailByEmail(finalApprover), finalApprover);
}

function getGustoConnectionMessage(
    policy: Policy | undefined,
    connectionSyncProgress: PolicyConnectionSyncProgress | undefined,
    getLocalDateFromDatetime: LocaleContextProps['getLocalDateFromDatetime'],
    datetimeToRelative: LocaleContextProps['datetimeToRelative'],
    translate: LocaleContextProps['translate'],
) {
    const gustoConnection = policy?.connections?.gusto;

    if (!gustoConnection) {
        return translate('workspace.hr.gusto.connectionDescription');
    }

    if (gustoConnection.lastSync?.isSuccessful === false && gustoConnection.lastSync.errorMessage) {
        return translate('workspace.hr.gusto.syncError', {message: gustoConnection.lastSync.errorMessage});
    }

    const successfulDate = getIntegrationLastSuccessfulDate(getLocalDateFromDatetime, gustoConnection, connectionSyncProgress);
    if (!successfulDate) {
        return translate('workspace.hr.gusto.connected');
    }

    return translate('workspace.hr.gusto.lastSync', {relativeDate: datetimeToRelative(successfulDate)});
}

function getGustoSettingRows(policyID: string, policy: Policy | undefined, translate: LocaleContextProps['translate']): HRSettingRow[] {
    return [
        {
            title: translate('workspace.hr.gusto.approvalMode'),
            description: getGustoApprovalModeLabel(policy, translate),
            route: ROUTES.WORKSPACE_HR_GUSTO_APPROVAL_MODE.getRoute(policyID),
            pendingAction: policy?.connections?.gusto?.config?.pendingFields?.approvalMode,
        },
        {
            title: translate('workspace.hr.gusto.finalApprover'),
            description: getGustoFinalApproverDisplayName(policy, translate),
            route: ROUTES.WORKSPACE_HR_GUSTO_FINAL_APPROVER.getRoute(policyID),
            pendingAction: policy?.connections?.gusto?.config?.pendingFields?.finalApprover,
        },
    ];
}

export {getGustoApprovalModeLabel, getGustoConnectionMessage, getGustoFinalApproverDisplayName, getGustoSettingRows};

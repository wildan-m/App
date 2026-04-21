import type {OnyxUpdate} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as API from '@libs/API';
import type {UpdateGustoApprovalModeParams, UpdateGustoFinalApproverParams} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import * as ErrorUtils from '@libs/ErrorUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Connections} from '@src/types/onyx/Policy';

function buildGustoConfigUpdateOnyxData<TConfigUpdate extends Partial<Connections['gusto']['config']>>(
    policyID: string,
    configUpdate: TConfigUpdate,
    configCurrentData: Partial<TConfigUpdate>,
) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.GUSTO]: {
                        config: {
                            ...configUpdate,
                            pendingFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE])),
                            errorFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                        },
                    },
                },
            },
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.GUSTO]: {
                        config: {
                            ...configCurrentData,
                            pendingFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                            errorFields: Object.fromEntries(
                                Object.keys(configUpdate).map((settingName) => [settingName, ErrorUtils.getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')]),
                            ),
                        },
                    },
                },
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.GUSTO]: {
                        config: {
                            pendingFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                            errorFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                        },
                    },
                },
            },
        },
    ];

    return {optimisticData, failureData, successData};
}

function updateGustoApprovalMode(policyID: string | undefined, approvalMode: Connections['gusto']['config']['approvalMode'], currentApprovalMode: Connections['gusto']['config']['approvalMode']) {
    if (!policyID || !approvalMode) {
        return;
    }

    const {optimisticData, failureData, successData} = buildGustoConfigUpdateOnyxData(policyID, {approvalMode}, {approvalMode: currentApprovalMode});
    const parameters: UpdateGustoApprovalModeParams = {
        policyID,
        approvalMode,
    };

    API.write(WRITE_COMMANDS.UPDATE_GUSTO_APPROVAL_MODE, parameters, {optimisticData, failureData, successData});
}

function updateGustoFinalApprover(
    policyID: string | undefined,
    finalApprover: Connections['gusto']['config']['finalApprover'],
    currentFinalApprover: Connections['gusto']['config']['finalApprover'],
) {
    if (!policyID) {
        return;
    }

    const {optimisticData, failureData, successData} = buildGustoConfigUpdateOnyxData(policyID, {finalApprover}, {finalApprover: currentFinalApprover});
    const parameters: UpdateGustoFinalApproverParams = {
        policyID,
        finalApprover,
    };

    API.write(WRITE_COMMANDS.UPDATE_GUSTO_FINAL_APPROVER, parameters, {optimisticData, failureData, successData});
}

export {updateGustoApprovalMode, updateGustoFinalApprover};

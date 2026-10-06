import {write} from '@libs/API';
import type {UpdateZohoBooksOrganizationParams} from '@libs/API/parameters';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {getCommandURL} from '@libs/ApiUtils';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ZohoBooksConnectionsConfig} from '@src/types/onyx/Policy';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

function getZohoBooksSetupLink(policyID: string) {
    const params = new URLSearchParams({policyID});
    const commandURL = getCommandURL({command: READ_COMMANDS.CONNECT_POLICY_TO_ZOHO_BOOKS, shouldSkipWebProxy: true});
    return commandURL + params.toString();
}

function clearZohoBooksErrorField(policyID: string, fieldName: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        connections: {
            [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
                config: {errorFields: {[fieldName]: null}},
            },
        },
    });
}

function prepareZohoBooksOnyxData<TSettingName extends keyof ZohoBooksConnectionsConfig>(
    policyID: string,
    settingName: TSettingName,
    settingValue: Partial<ZohoBooksConnectionsConfig[TSettingName]>,
    oldSettingValue: Partial<ZohoBooksConnectionsConfig[TSettingName]> | null,
) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
                        config: {
                            [settingName]: settingValue ?? null,
                            pendingFields: {
                                [settingName]: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                            },
                            errorFields: {
                                [settingName]: null,
                            },
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
                    [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
                        config: {
                            pendingFields: {
                                [settingName]: null,
                            },
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
                    [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
                        config: {
                            [settingName]: oldSettingValue ?? null,
                            pendingFields: {
                                [settingName]: null,
                            },
                            errorFields: {
                                [settingName]: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
                            },
                        },
                    },
                },
            },
        },
    ];

    return {optimisticData, successData, failureData};
}

function updateZohoBooksOrganization(policyID: string, organizationID: ZohoBooksConnectionsConfig['organizationID'], oldOrganizationID?: ZohoBooksConnectionsConfig['organizationID']) {
    const onyxData = prepareZohoBooksOnyxData(policyID, CONST.ZOHO_BOOKS_CONFIG.ORGANIZATION_ID, organizationID, oldOrganizationID ?? null);
    const params: UpdateZohoBooksOrganizationParams = {
        policyID,
        organizationID,
    };
    write(WRITE_COMMANDS.UPDATE_ZOHO_BOOKS_ORGANIZATION, params, onyxData);
}

export {getZohoBooksSetupLink, clearZohoBooksErrorField, updateZohoBooksOrganization};

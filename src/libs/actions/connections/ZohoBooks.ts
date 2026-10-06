import {write} from '@libs/API';
import type {UpdateZohoBooksEnableNewCategoriesParams, UpdateZohoBooksOrganizationParams, UpdateZohoBooksSyncTaxRatesParams, UpdateZohoBooksTagMappingParams} from '@libs/API/parameters';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {getCommandURL} from '@libs/ApiUtils';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ZohoBooksCoding, ZohoBooksConnectionsConfig} from '@src/types/onyx/Policy';

import type {OnyxUpdate} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

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

function prepareZohoBooksCodingOnyxData<TSettingName extends keyof ZohoBooksCoding>(
    policyID: string,
    settingName: TSettingName,
    settingValue: Partial<ZohoBooksCoding[TSettingName]>,
    oldSettingValue: Partial<ZohoBooksCoding[TSettingName]> | null,
) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
                        config: {
                            coding: {
                                [settingName]: settingValue ?? null,
                            },
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
                            coding: {
                                [settingName]: oldSettingValue ?? null,
                            },
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

function prepareZohoBooksTagMappingOnyxData(
    policyID: string,
    tagID: keyof NonNullable<ZohoBooksCoding['tagMappings']>,
    mapping: ValueOf<NonNullable<ZohoBooksCoding['tagMappings']>>,
    oldMapping: ValueOf<NonNullable<ZohoBooksCoding['tagMappings']>> | null,
) {
    const tagOfflineFeedbackKey = `${CONST.ZOHO_BOOKS_CONFIG.TAG_MAPPING_PREFIX}${tagID}`;

    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
                        config: {
                            coding: {
                                tagMappings: {
                                    [tagID]: mapping,
                                },
                            },
                            pendingFields: {
                                [tagOfflineFeedbackKey]: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                            },
                            errorFields: {
                                [tagOfflineFeedbackKey]: null,
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
                                [tagOfflineFeedbackKey]: null,
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
                            coding: {
                                tagMappings: {
                                    [tagID]: oldMapping ?? null,
                                },
                            },
                            pendingFields: {
                                [tagOfflineFeedbackKey]: null,
                            },
                            errorFields: {
                                [tagOfflineFeedbackKey]: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
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

function updateZohoBooksEnableNewCategories(policyID: string, enabled: ZohoBooksConnectionsConfig['enableNewCategories'], oldEnabled?: ZohoBooksConnectionsConfig['enableNewCategories']) {
    const onyxData = prepareZohoBooksOnyxData(policyID, CONST.ZOHO_BOOKS_CONFIG.ENABLE_NEW_CATEGORIES, enabled, oldEnabled ?? null);
    const parameters: UpdateZohoBooksEnableNewCategoriesParams = {
        policyID,
        enabled,
    };
    write(WRITE_COMMANDS.UPDATE_ZOHO_BOOKS_ENABLE_NEW_CATEGORIES, parameters, onyxData);
}

function updateZohoBooksSyncTaxRates(policyID: string, enabled: ZohoBooksCoding['syncTaxRates'], oldEnabled?: ZohoBooksCoding['syncTaxRates']) {
    const onyxData = prepareZohoBooksCodingOnyxData(policyID, CONST.ZOHO_BOOKS_CONFIG.SYNC_TAX_RATES, enabled, oldEnabled ?? null);
    const parameters: UpdateZohoBooksSyncTaxRatesParams = {
        policyID,
        enabled,
    };
    write(WRITE_COMMANDS.UPDATE_ZOHO_BOOKS_SYNC_TAX_RATES, parameters, onyxData);
}

function updateZohoBooksTagMapping(
    policyID: string,
    tagID: keyof NonNullable<ZohoBooksCoding['tagMappings']>,
    mapping: ValueOf<NonNullable<ZohoBooksCoding['tagMappings']>>,
    oldMapping?: ValueOf<NonNullable<ZohoBooksCoding['tagMappings']>>,
) {
    const onyxData = prepareZohoBooksTagMappingOnyxData(policyID, tagID, mapping, oldMapping ?? null);
    const parameters: UpdateZohoBooksTagMappingParams = {
        policyID,
        tagID,
        mapping,
    };
    write(WRITE_COMMANDS.UPDATE_ZOHO_BOOKS_TAG_MAPPING, parameters, onyxData);
}

export {getZohoBooksSetupLink, clearZohoBooksErrorField, updateZohoBooksOrganization, updateZohoBooksEnableNewCategories, updateZohoBooksSyncTaxRates, updateZohoBooksTagMapping};

import {write} from '@libs/API';
import type {UpdateBusinessCentralDimensionMappingParams, UpdateBusinessCentralEnableNewCategoriesParams, UpdateBusinessCentralSyncTaxRatesParams} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {BusinessCentralCoding, BusinessCentralConnectionsConfig} from '@src/types/onyx/Policy';

import type {OnyxUpdate} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

function clearBusinessCentralErrorField(policyID: string, fieldName: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        connections: {
            [CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL]: {
                config: {errorFields: {[fieldName]: null}},
            },
        },
    });
}

function prepareBusinessCentralOnyxData<TSettingName extends keyof BusinessCentralConnectionsConfig>(
    policyID: string,
    settingName: TSettingName,
    settingValue: Partial<BusinessCentralConnectionsConfig[TSettingName]>,
    oldSettingValue: Partial<BusinessCentralConnectionsConfig[TSettingName]> | null,
) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    businessCentral: {
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
                    businessCentral: {
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
                    businessCentral: {
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

function prepareBusinessCentralCodingOnyxData<TSettingName extends keyof BusinessCentralCoding>(
    policyID: string,
    settingName: TSettingName,
    settingValue: Partial<BusinessCentralCoding[TSettingName]>,
    oldSettingValue: Partial<BusinessCentralCoding[TSettingName]> | null,
) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    businessCentral: {
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
                    businessCentral: {
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
                    businessCentral: {
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

function prepareBusinessCentralDimensionMappingOnyxData(
    policyID: string,
    dimensionID: keyof NonNullable<BusinessCentralCoding['dimensionMappings']>,
    mapping: ValueOf<NonNullable<BusinessCentralCoding['dimensionMappings']>>,
    oldMapping: ValueOf<NonNullable<BusinessCentralCoding['dimensionMappings']>> | null,
) {
    const dimensionOfflineFeedbackKey = `${CONST.BUSINESS_CENTRAL_CONFIG.DIMENSION_MAPPING_PREFIX}${dimensionID}`;

    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    businessCentral: {
                        config: {
                            coding: {
                                dimensionMappings: {
                                    [dimensionID]: mapping,
                                },
                            },
                            pendingFields: {
                                [dimensionOfflineFeedbackKey]: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                            },
                            errorFields: {
                                [dimensionOfflineFeedbackKey]: null,
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
                    businessCentral: {
                        config: {
                            pendingFields: {
                                [dimensionOfflineFeedbackKey]: null,
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
                    businessCentral: {
                        config: {
                            coding: {
                                dimensionMappings: {
                                    [dimensionID]: oldMapping ?? null,
                                },
                            },
                            pendingFields: {
                                [dimensionOfflineFeedbackKey]: null,
                            },
                            errorFields: {
                                [dimensionOfflineFeedbackKey]: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
                            },
                        },
                    },
                },
            },
        },
    ];

    return {optimisticData, successData, failureData};
}

function updateBusinessCentralEnableNewCategories(
    policyID: string,
    enabled: BusinessCentralConnectionsConfig['enableNewCategories'],
    oldEnabled?: BusinessCentralConnectionsConfig['enableNewCategories'],
) {
    const onyxData = prepareBusinessCentralOnyxData(policyID, CONST.BUSINESS_CENTRAL_CONFIG.ENABLE_NEW_CATEGORIES, enabled, oldEnabled ?? null);
    const parameters: UpdateBusinessCentralEnableNewCategoriesParams = {
        policyID,
        enabled,
    };
    write(WRITE_COMMANDS.UPDATE_BUSINESS_CENTRAL_ENABLE_NEW_CATEGORIES, parameters, onyxData);
}

function updateBusinessCentralSyncTaxRates(policyID: string, enabled: BusinessCentralCoding['syncTaxRates'], oldEnabled?: BusinessCentralCoding['syncTaxRates']) {
    const onyxData = prepareBusinessCentralCodingOnyxData(policyID, CONST.BUSINESS_CENTRAL_CONFIG.SYNC_TAX_RATES, enabled, oldEnabled ?? null);
    const parameters: UpdateBusinessCentralSyncTaxRatesParams = {
        policyID,
        enabled,
    };
    write(WRITE_COMMANDS.UPDATE_BUSINESS_CENTRAL_SYNC_TAX_RATES, parameters, onyxData);
}

function updateBusinessCentralDimensionMapping(
    policyID: string,
    dimensionID: keyof NonNullable<BusinessCentralCoding['dimensionMappings']>,
    mapping: ValueOf<NonNullable<BusinessCentralCoding['dimensionMappings']>>,
    oldMapping?: ValueOf<NonNullable<BusinessCentralCoding['dimensionMappings']>>,
) {
    const onyxData = prepareBusinessCentralDimensionMappingOnyxData(policyID, dimensionID, mapping, oldMapping ?? null);
    const parameters: UpdateBusinessCentralDimensionMappingParams = {
        policyID,
        dimensionID,
        mapping,
    };
    write(WRITE_COMMANDS.UPDATE_BUSINESS_CENTRAL_DIMENSION_MAPPING, parameters, onyxData);
}

export {clearBusinessCentralErrorField, updateBusinessCentralEnableNewCategories, updateBusinessCentralSyncTaxRates, updateBusinessCentralDimensionMapping};

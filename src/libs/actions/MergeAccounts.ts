import * as API from '@libs/API';
import type {CancelDomainAccountMergeRequestParams, CreateDomainAccountMergeRequestParams, GetValidateCodeForAccountMergeParams, MergeWithValidateCodeParams} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import DateUtils from '@libs/DateUtils';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {appendCountryCode} from '@libs/LoginUtils';
import {rand64} from '@libs/NumberUtils';
import {parsePhoneNumber} from '@libs/PhoneNumber';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxUpdate} from 'react-native-onyx';

import {Str} from 'expensify-common';
import Onyx from 'react-native-onyx';

function requestValidationCodeForAccountMerge(email: string, validateCodeResent = false, countryCode: number = CONST.DEFAULT_COUNTRY_CODE) {
    const parsedPhoneNumber = parsePhoneNumber(appendCountryCode(Str.removeSMSDomain(email), countryCode));
    const normalizedEmail = parsedPhoneNumber.possible && parsedPhoneNumber.number?.e164 ? parsedPhoneNumber.number.e164 : email.toLowerCase();

    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                getValidateCodeForAccountMerge: {
                    isLoading: true,
                    validateCodeSent: false,
                    validateCodeResent: false,
                    errors: null,
                },
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                getValidateCodeForAccountMerge: {
                    isLoading: false,
                    validateCodeSent: !validateCodeResent,
                    validateCodeResent,
                    errors: null,
                },
            },
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                getValidateCodeForAccountMerge: {
                    isLoading: false,
                    validateCodeSent: false,
                    validateCodeResent: false,
                },
            },
        },
    ];

    const parameters: GetValidateCodeForAccountMergeParams = {
        email: normalizedEmail,
    };

    API.write(WRITE_COMMANDS.GET_VALIDATE_CODE_FOR_ACCOUNT_MERGE, parameters, {optimisticData, successData, failureData});
}

function clearGetValidateCodeForAccountMerge() {
    Onyx.merge(ONYXKEYS.ACCOUNT, {
        getValidateCodeForAccountMerge: {
            errors: null,
            validateCodeSent: false,
            validateCodeResent: false,
            isLoading: false,
        },
    });
}

function mergeWithValidateCode(email: string, validateCode: string) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                mergeWithValidateCode: {
                    isLoading: true,
                    isAccountMerged: false,
                    errors: null,
                },
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                mergeWithValidateCode: {
                    isLoading: false,
                    isAccountMerged: true,
                    errors: null,
                },
            },
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                mergeWithValidateCode: {
                    isLoading: false,
                    isAccountMerged: false,
                },
            },
        },
    ];

    const parameters: MergeWithValidateCodeParams = {
        email,
        validateCode,
    };

    API.write(WRITE_COMMANDS.MERGE_WITH_VALIDATE_CODE, parameters, {optimisticData, successData, failureData});
}

function clearMergeWithValidateCode() {
    Onyx.merge(ONYXKEYS.ACCOUNT, {
        mergeWithValidateCode: {
            errors: null,
            isLoading: false,
            isAccountMerged: false,
        },
    });
}

/**
 * Submits a domain-controlled account merge for admin approval. The merge form's loading and error state is reused so a failure leaves the user on the form with an inline error.
 */
function createDomainAccountMergeRequest(email: string, validateCode: string, requesterAccountID: number) {
    const requestID = rand64();
    const requestKey = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}` as const;

    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST | typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.SET,
            key: requestKey,
            value: {
                requestID,
                requesterAccountID,
                sourceLogin: email,
                created: DateUtils.getDBTime(),
                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD,
            },
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                mergeWithValidateCode: {
                    isLoading: true,
                    errors: null,
                },
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST | typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: requestKey,
            value: {pendingAction: null},
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                mergeWithValidateCode: {
                    isLoading: false,
                },
            },
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST | typeof ONYXKEYS.ACCOUNT>> = [
        {
            onyxMethod: Onyx.METHOD.SET,
            key: requestKey,
            value: null,
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                mergeWithValidateCode: {
                    isLoading: false,
                    errors: getMicroSecondOnyxErrorWithTranslationKey('mergeAccountsPage.accountValidate.errors.fallback'),
                },
            },
        },
    ];

    const parameters: CreateDomainAccountMergeRequestParams = {
        requestID,
        email,
        validateCode,
    };

    API.write(WRITE_COMMANDS.CREATE_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, {optimisticData, successData, failureData});
}

/**
 * Cancels the requester's pending request. The record stays until the server confirms, so a failed cancellation never hides a request that is still pending.
 */
function cancelDomainAccountMergeRequest(requestID: string) {
    const requestKey = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}` as const;

    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: requestKey,
            value: {
                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
                errors: null,
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST>> = [
        {
            onyxMethod: Onyx.METHOD.SET,
            key: requestKey,
            value: null,
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: requestKey,
            value: {
                pendingAction: null,
                errors: getMicroSecondOnyxErrorWithTranslationKey('mergeAccountsPage.domainAccountMergeRequest.cancelError'),
            },
        },
    ];

    const parameters: CancelDomainAccountMergeRequestParams = {requestID};

    API.write(WRITE_COMMANDS.CANCEL_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, {optimisticData, successData, failureData});
}

function clearDomainAccountMergeRequestErrors(requestID: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}`, {errors: null});
}

export {
    requestValidationCodeForAccountMerge,
    clearGetValidateCodeForAccountMerge,
    mergeWithValidateCode,
    clearMergeWithValidateCode,
    createDomainAccountMergeRequest,
    cancelDomainAccountMergeRequest,
    clearDomainAccountMergeRequestErrors,
};

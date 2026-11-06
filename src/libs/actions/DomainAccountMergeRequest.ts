import * as API from '@libs/API';
import type {
    ApproveDomainAccountMergeRequestParams,
    CancelDomainAccountMergeRequestParams,
    CreateDomainAccountMergeRequestParams,
    DenyDomainAccountMergeRequestParams,
} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequestResolution} from '@src/types/onyx/DomainAccountMergeRequest';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type RequestUpdates = Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST>>;
type AccountUpdates = Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>>;

/**
 * Submits a merge request for admin approval. There is no optimistic record: the server decides eligibility and reuses the pending request on an identical retry,
 * so the record and its requestID only come from the response. The validate code proves the requester controls the account, and it is never stored or reused for approval.
 */
function createDomainAccountMergeRequest(email: string, validateCode: string) {
    const optimisticData: AccountUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.ACCOUNT, value: {createDomainAccountMergeRequest: {isLoading: true, errors: null}}}];
    const failureData: AccountUpdates = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {createDomainAccountMergeRequest: {errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')}},
        },
    ];
    const finallyData: AccountUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.ACCOUNT, value: {createDomainAccountMergeRequest: {isLoading: false}}}];

    const parameters: CreateDomainAccountMergeRequestParams = {email, validateCode};
    API.write(WRITE_COMMANDS.CREATE_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, {optimisticData, failureData, finallyData});
}

function buildDecisionOnyxData(requestID: string, domainAccountID: number, decision: DomainAccountMergeRequestResolution) {
    const key = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}` as const;

    // The record stays until the server answers so a failed decision never hides a request that is still pending.
    const optimisticData: RequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {pendingResolution: decision, errors: null}}];

    // API.write can't report the outcome, so successData leaves the decision on the record for the UI to confirm to the user.
    const successData: RequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {requestID, domainAccountID, resolution: decision}}];

    const failureData: RequestUpdates = [
        {onyxMethod: Onyx.METHOD.MERGE, key, value: {requestID, domainAccountID, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')}},
    ];

    // A 460 response skips failureData, so the in-flight state is cleared here or an admin who just lost access would be left with a spinner.
    const finallyData: RequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {pendingResolution: null}}];

    return {optimisticData, successData, failureData, finallyData};
}

/** Approves a request through the in-product action. It takes no validate code or approval-link token, because the server authorizes the admin's own session. */
function approveDomainAccountMergeRequest(requestID: string, domainAccountID: number) {
    const parameters: ApproveDomainAccountMergeRequestParams = {requestID};
    API.write(WRITE_COMMANDS.APPROVE_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, buildDecisionOnyxData(requestID, domainAccountID, CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.APPROVED));
}

function denyDomainAccountMergeRequest(requestID: string, domainAccountID: number) {
    const parameters: DenyDomainAccountMergeRequestParams = {requestID};
    API.write(WRITE_COMMANDS.DENY_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, buildDecisionOnyxData(requestID, domainAccountID, CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.DENIED));
}

/** Cancels the requester's own request. The requester needs no confirmation beyond the request going away, so success removes the record. */
function cancelDomainAccountMergeRequest(requestID: string) {
    const key = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}` as const;

    const optimisticData: RequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {pendingResolution: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.CANCELLED, errors: null}}];
    const successData: RequestUpdates = [{onyxMethod: Onyx.METHOD.SET, key, value: null}];
    const failureData: RequestUpdates = [
        {onyxMethod: Onyx.METHOD.MERGE, key, value: {pendingResolution: null, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')}},
    ];

    const parameters: CancelDomainAccountMergeRequestParams = {requestID};
    API.write(WRITE_COMMANDS.CANCEL_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, {optimisticData, successData, failureData});
}

function clearCreateDomainAccountMergeRequestErrors() {
    Onyx.merge(ONYXKEYS.ACCOUNT, {createDomainAccountMergeRequest: {errors: null}});
}

function clearDomainAccountMergeRequestErrors(requestID: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}`, {errors: null});
}

/** Removes a settled record once the UI has confirmed the outcome to the user. */
function removeDomainAccountMergeRequest(requestID: string) {
    Onyx.set(`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}`, null);
}

export {
    approveDomainAccountMergeRequest,
    cancelDomainAccountMergeRequest,
    clearCreateDomainAccountMergeRequestErrors,
    clearDomainAccountMergeRequestErrors,
    createDomainAccountMergeRequest,
    denyDomainAccountMergeRequest,
    removeDomainAccountMergeRequest,
};

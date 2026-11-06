/**
 * Actions a domain admin takes on a domain account merge request.
 */
import * as API from '@libs/API';
import type {ApproveDomainAccountMergeRequestParams, DenyDomainAccountMergeRequestParams} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequestDecision} from '@src/types/onyx/DomainAccountMergeRequest';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type DomainAccountMergeRequestUpdates = Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST>>;

function buildDecisionOnyxData(requestID: string, domainAccountID: number, decision: DomainAccountMergeRequestDecision) {
    const key = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}` as const;

    // The record stays until the server answers so a failed decision never hides a request that is still pending.
    const optimisticData: DomainAccountMergeRequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {pendingDecision: decision, errors: null}}];

    // API.write can't report the outcome, so successData leaves the decision on the record for the page to confirm to the user.
    const successData: DomainAccountMergeRequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {requestID, domainAccountID, resolvedDecision: decision}}];

    const errorKey = decision === CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED ? 'domain.members.accountMergeRequests.approveError' : 'domain.members.accountMergeRequests.denyError';
    const failureData: DomainAccountMergeRequestUpdates = [
        {onyxMethod: Onyx.METHOD.MERGE, key, value: {requestID, domainAccountID, errors: getMicroSecondOnyxErrorWithTranslationKey(errorKey)}},
    ];

    // A 460 response skips failureData, so the in-flight state is cleared here or an admin who just lost access would be left with a spinner.
    const finallyData: DomainAccountMergeRequestUpdates = [{onyxMethod: Onyx.METHOD.MERGE, key, value: {requestID, domainAccountID, pendingDecision: null}}];

    return {optimisticData, successData, failureData, finallyData};
}

function approveDomainAccountMergeRequest(requestID: string, domainAccountID: number) {
    const parameters: ApproveDomainAccountMergeRequestParams = {requestID};
    API.write(WRITE_COMMANDS.APPROVE_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, buildDecisionOnyxData(requestID, domainAccountID, CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED));
}

function denyDomainAccountMergeRequest(requestID: string, domainAccountID: number) {
    const parameters: DenyDomainAccountMergeRequestParams = {requestID};
    API.write(WRITE_COMMANDS.DENY_DOMAIN_ACCOUNT_MERGE_REQUEST, parameters, buildDecisionOnyxData(requestID, domainAccountID, CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.DENIED));
}

function clearDomainAccountMergeRequestErrors(requestID: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}`, {errors: null});
}

function removeDomainAccountMergeRequest(requestID: string) {
    Onyx.set(`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}`, null);
}

export {approveDomainAccountMergeRequest, denyDomainAccountMergeRequest, clearDomainAccountMergeRequestErrors, removeDomainAccountMergeRequest};

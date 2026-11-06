/**
 * Pure helpers that decide which domain account merge requests a domain admin sees and whether they can decide them.
 */
import CONST from '@src/CONST';
import type {DomainAccountMergeRequest} from '@src/types/onyx';
import type Domain from '@src/types/onyx/Domain';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import {isAdminSelector} from '@selectors/Domain';
import {fromZonedTime} from 'date-fns-tz';

type CanDecideDomainAccountMergeRequestParams = {
    request: OnyxEntry<DomainAccountMergeRequest>;
    currentUserAccountID: number | undefined;
    currentUserLogin: string | undefined;
    sourceDomain: OnyxEntry<Domain>;
    targetDomain: OnyxEntry<Domain>;
    sourceDomainTechnicalContactEmail: string | undefined;
    targetDomainTechnicalContactEmail: string | undefined;
};

/** Returns when the request expires, in milliseconds since the epoch. Derived only from `created`, so reads and navigation can't extend it. */
function getDomainAccountMergeRequestExpirationTime(request: DomainAccountMergeRequest): number {
    return fromZonedTime(request.created, 'UTC').getTime() + CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.EXPIRATION_MS;
}

/** Returns the unexpired requests for a domain's Members page, soonest to expire first. A requester never reviews their own request. */
function getReviewableDomainAccountMergeRequests(
    requests: OnyxCollection<DomainAccountMergeRequest>,
    domainAccountID: number,
    currentUserAccountID: number | undefined,
    now: number,
): DomainAccountMergeRequest[] {
    const reviewableRequests: DomainAccountMergeRequest[] = [];
    for (const request of Object.values(requests ?? {})) {
        if (
            !request?.created ||
            !!request.resolvedDecision ||
            request.domainAccountID !== domainAccountID ||
            request.requesterAccountID === currentUserAccountID ||
            !(getDomainAccountMergeRequestExpirationTime(request) > now)
        ) {
            continue;
        }
        reviewableRequests.push(request);
    }
    return reviewableRequests.sort((request1, request2) => getDomainAccountMergeRequestExpirationTime(request1) - getDomainAccountMergeRequestExpirationTime(request2));
}

/**
 * Returns a domain's records that no longer represent a pending request and only need confirming to the user and removing.
 * A record without `created` is what is left when the server removes a request and the action's failureData or finallyData then merges onto the removed key.
 */
function getSettledDomainAccountMergeRequests(requests: OnyxCollection<DomainAccountMergeRequest>, domainAccountID: number): DomainAccountMergeRequest[] {
    const settledRequests: DomainAccountMergeRequest[] = [];
    for (const request of Object.values(requests ?? {})) {
        if (!request?.requestID || request.domainAccountID !== domainAccountID || (!!request.created && !request.resolvedDecision)) {
            continue;
        }
        settledRequests.push(request);
    }
    return settledRequests;
}

/**
 * A same-domain request can be decided by a current admin of the domain. A cross-domain request needs the shared technical contact administering both verified domains,
 * so being an admin of either domain alone is not enough.
 */
function canDecideDomainAccountMergeRequest({
    request,
    currentUserAccountID,
    currentUserLogin,
    sourceDomain,
    targetDomain,
    sourceDomainTechnicalContactEmail,
    targetDomainTechnicalContactEmail,
}: CanDecideDomainAccountMergeRequestParams): boolean {
    if (!request || !isAdminSelector(currentUserAccountID)(sourceDomain)) {
        return false;
    }

    if (!request.targetDomainAccountID || request.targetDomainAccountID === request.domainAccountID) {
        return true;
    }

    return (
        !!currentUserLogin &&
        !!sourceDomain?.validated &&
        !!targetDomain?.validated &&
        isAdminSelector(currentUserAccountID)(targetDomain) &&
        sourceDomainTechnicalContactEmail === currentUserLogin &&
        targetDomainTechnicalContactEmail === currentUserLogin
    );
}

export {canDecideDomainAccountMergeRequest, getDomainAccountMergeRequestExpirationTime, getReviewableDomainAccountMergeRequests, getSettledDomainAccountMergeRequests};

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {CardFeeds, Domain, DomainAccountMergeRequest} from '@src/types/onyx';
import getEmptyArray from '@src/types/utils/getEmptyArray';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import {fromZonedTime} from 'date-fns-tz';

import {isAdminSelector, technicalContactSettingsSelector} from './Domain';

type DomainAccountMergeRequests = OnyxCollection<DomainAccountMergeRequest>;

type CanDecideDomainAccountMergeRequestParams = {
    request: OnyxEntry<DomainAccountMergeRequest>;
    currentUserAccountID: number | undefined;
    currentUserLogin: string | undefined;
    sourceDomain: OnyxEntry<Domain>;
    targetDomain: OnyxEntry<Domain>;
    sourceDomainMemberSharedNVP: OnyxEntry<CardFeeds>;
    targetDomainMemberSharedNVP: OnyxEntry<CardFeeds>;
};

type GetActionableDomainAccountMergeRequestsParams = {
    requests: DomainAccountMergeRequests;
    domains: OnyxCollection<Domain>;
    domainMemberSharedNVPs: OnyxCollection<CardFeeds>;
    currentUserAccountID: number | undefined;
    currentUserLogin: string | undefined;
    now: number;
};

type ActionableDomainAccountMergeRequests = {
    count: number;
    domainAccountIDs: number[];
};

const EMPTY_ACTIONABLE_REQUESTS: ActionableDomainAccountMergeRequests = {count: 0, domainAccountIDs: getEmptyArray<number>()};

/** Returns when the request expires, in milliseconds since the epoch. Derived only from `created`, so reads and navigation can't extend it. */
function getDomainAccountMergeRequestExpirationTime(request: DomainAccountMergeRequest): number {
    return fromZonedTime(request.created, 'UTC').getTime() + CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.EXPIRATION_MS;
}

/**
 * The one definition of an outstanding request used by every surface. A record without `created` is what is left when the server removes a request
 * and an action's failureData or finallyData then merges onto the removed key, so it isn't a request. An unparsable `created` is treated as expired.
 */
function isOutstandingDomainAccountMergeRequest(request: OnyxEntry<DomainAccountMergeRequest>, now: number): request is DomainAccountMergeRequest {
    return !!request?.created && !request.resolution && now < getDomainAccountMergeRequestExpirationTime(request);
}

/** Returns the requester's own outstanding request, preferring the latest to expire if the server sent more than one. */
function getRequesterDomainAccountMergeRequest(requests: DomainAccountMergeRequests, requesterAccountID: number | undefined, now: number): DomainAccountMergeRequest | undefined {
    if (!requesterAccountID) {
        return undefined;
    }

    let requesterRequest: DomainAccountMergeRequest | undefined;
    for (const request of Object.values(requests ?? {})) {
        if (!isOutstandingDomainAccountMergeRequest(request, now) || request.requesterAccountID !== requesterAccountID) {
            continue;
        }
        if (!requesterRequest || getDomainAccountMergeRequestExpirationTime(request) > getDomainAccountMergeRequestExpirationTime(requesterRequest)) {
            requesterRequest = request;
        }
    }
    return requesterRequest;
}

/** Returns a domain's outstanding requests for its Members page, soonest to expire first. A requester never reviews their own request. */
function getReviewableDomainAccountMergeRequests(
    requests: DomainAccountMergeRequests,
    domainAccountID: number,
    currentUserAccountID: number | undefined,
    now: number,
): DomainAccountMergeRequest[] {
    return Object.values(requests ?? {})
        .filter(
            (request): request is DomainAccountMergeRequest =>
                isOutstandingDomainAccountMergeRequest(request, now) && request.domainAccountID === domainAccountID && request.requesterAccountID !== currentUserAccountID,
        )
        .sort((request1, request2) => getDomainAccountMergeRequestExpirationTime(request1) - getDomainAccountMergeRequestExpirationTime(request2));
}

/** Returns a domain's records that only need confirming to the user and removing: the server accepted the decision, or it removed the request and rejected the action. */
function getSettledDomainAccountMergeRequests(requests: DomainAccountMergeRequests, domainAccountID: number): DomainAccountMergeRequest[] {
    return Object.values(requests ?? {}).filter(
        (request): request is DomainAccountMergeRequest => !!request?.requestID && request.domainAccountID === domainAccountID && (!request.created || !!request.resolution),
    );
}

/** Returns the next time an outstanding request expires. Crossing it doesn't change Onyx, so the UI needs a timer to stop showing the request. */
function getNextDomainAccountMergeRequestExpirationTime(requests: DomainAccountMergeRequests, now: number): number | undefined {
    let nextExpirationTime: number | undefined;
    for (const request of Object.values(requests ?? {})) {
        if (!isOutstandingDomainAccountMergeRequest(request, now)) {
            continue;
        }
        const expirationTime = getDomainAccountMergeRequestExpirationTime(request);
        if (nextExpirationTime === undefined || expirationTime < nextExpirationTime) {
            nextExpirationTime = expirationTime;
        }
    }
    return nextExpirationTime;
}

/**
 * A same-domain request can be decided by a current admin of the domain. A cross-domain request needs the shared technical contact administering both verified domains,
 * so being an admin of either domain alone is not enough. The server remains the final authority.
 */
function canDecideDomainAccountMergeRequest({
    request,
    currentUserAccountID,
    currentUserLogin,
    sourceDomain,
    targetDomain,
    sourceDomainMemberSharedNVP,
    targetDomainMemberSharedNVP,
}: CanDecideDomainAccountMergeRequestParams): boolean {
    if (!request || !isAdminSelector(currentUserAccountID)(sourceDomain)) {
        return false;
    }

    if (!request.targetDomainAccountID || request.targetDomainAccountID === request.domainAccountID) {
        return true;
    }

    const login = currentUserLogin?.toLowerCase();
    return (
        !!login &&
        !!sourceDomain?.validated &&
        !!targetDomain?.validated &&
        isAdminSelector(currentUserAccountID)(targetDomain) &&
        technicalContactSettingsSelector(sourceDomainMemberSharedNVP).technicalContactEmail?.toLowerCase() === login &&
        technicalContactSettingsSelector(targetDomainMemberSharedNVP).technicalContactEmail?.toLowerCase() === login
    );
}

/**
 * Counts the requests the current user can act on right now, for the Home task and the green-brick-road indicators. A request whose resolution is in flight no longer needs
 * attention, and a failed action brings it back. A request on a domain missing from the user's domains isn't counted, so an indicator never leads to a page with no row.
 */
function getActionableDomainAccountMergeRequests({
    requests,
    domains,
    domainMemberSharedNVPs,
    currentUserAccountID,
    currentUserLogin,
    now,
}: GetActionableDomainAccountMergeRequestsParams): ActionableDomainAccountMergeRequests {
    let count = 0;
    const domainAccountIDs = new Set<number>();

    for (const request of Object.values(requests ?? {})) {
        if (!isOutstandingDomainAccountMergeRequest(request, now) || !request.domainAccountID || request.pendingResolution || request.requesterAccountID === currentUserAccountID) {
            continue;
        }

        const canDecide = canDecideDomainAccountMergeRequest({
            request,
            currentUserAccountID,
            currentUserLogin,
            sourceDomain: domains?.[`${ONYXKEYS.COLLECTION.DOMAIN}${request.domainAccountID}`],
            targetDomain: domains?.[`${ONYXKEYS.COLLECTION.DOMAIN}${request.targetDomainAccountID}`],
            sourceDomainMemberSharedNVP: domainMemberSharedNVPs?.[`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${request.domainAccountID}`],
            targetDomainMemberSharedNVP: domainMemberSharedNVPs?.[`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${request.targetDomainAccountID}`],
        });
        if (!canDecide) {
            continue;
        }

        count++;
        domainAccountIDs.add(request.domainAccountID);
    }

    return count > 0 ? {count, domainAccountIDs: [...domainAccountIDs]} : EMPTY_ACTIONABLE_REQUESTS;
}

export {
    canDecideDomainAccountMergeRequest,
    getActionableDomainAccountMergeRequests,
    getDomainAccountMergeRequestExpirationTime,
    getNextDomainAccountMergeRequestExpirationTime,
    getRequesterDomainAccountMergeRequest,
    getReviewableDomainAccountMergeRequests,
    getSettledDomainAccountMergeRequests,
    isOutstandingDomainAccountMergeRequest,
};
export type {ActionableDomainAccountMergeRequests};

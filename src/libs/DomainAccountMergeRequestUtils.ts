import CONST from '@src/CONST';
import type {DomainAccountMergeRequest} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {fromZonedTime} from 'date-fns-tz';

/** Returns when the request expires, in milliseconds since the epoch. Derived only from `created`, so reads and navigation can't extend it. */
function getDomainAccountMergeRequestExpirationTime(request: DomainAccountMergeRequest): number {
    return fromZonedTime(request.created, 'UTC').getTime() + CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.EXPIRATION_MS;
}

/** Returns the requester's own unexpired request, preferring the latest to expire if the server sent more than one. */
function getOutstandingDomainAccountMergeRequest(
    requests: OnyxCollection<DomainAccountMergeRequest>,
    requesterAccountID: number | undefined,
    now: number,
): DomainAccountMergeRequest | undefined {
    let outstandingRequest: DomainAccountMergeRequest | undefined;
    for (const request of Object.values(requests ?? {})) {
        if (!request?.created || !requesterAccountID || request.requesterAccountID !== requesterAccountID || !(getDomainAccountMergeRequestExpirationTime(request) > now)) {
            continue;
        }
        if (!outstandingRequest || getDomainAccountMergeRequestExpirationTime(request) > getDomainAccountMergeRequestExpirationTime(outstandingRequest)) {
            outstandingRequest = request;
        }
    }
    return outstandingRequest;
}

export {getDomainAccountMergeRequestExpirationTime, getOutstandingDomainAccountMergeRequest};

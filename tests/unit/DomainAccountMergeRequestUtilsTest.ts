import {getDomainAccountMergeRequestExpirationTime, getOutstandingDomainAccountMergeRequest} from '@libs/DomainAccountMergeRequestUtils';

import type {DomainAccountMergeRequest} from '@src/types/onyx';

const REQUESTER_ACCOUNT_ID = 1;
const CREATED = '2026-11-06 00:00:00.000';
const CREATED_MS = Date.UTC(2026, 10, 6);
const DAY_MS = 24 * 60 * 60 * 1000;

function buildRequest(overrides: Partial<DomainAccountMergeRequest> = {}): DomainAccountMergeRequest {
    return {requestID: '1', requesterAccountID: REQUESTER_ACCOUNT_ID, sourceLogin: 'source@domain.com', created: CREATED, ...overrides};
}

describe('DomainAccountMergeRequestUtils', () => {
    it('expires exactly 24 hours after the UTC generation time', () => {
        expect(getDomainAccountMergeRequestExpirationTime(buildRequest())).toBe(CREATED_MS + DAY_MS);
    });

    it('returns a request only until its expiry', () => {
        const requests = {domainAccountMergeRequest_1: buildRequest()};

        expect(getOutstandingDomainAccountMergeRequest(requests, REQUESTER_ACCOUNT_ID, CREATED_MS + DAY_MS - 1)?.requestID).toBe('1');
        expect(getOutstandingDomainAccountMergeRequest(requests, REQUESTER_ACCOUNT_ID, CREATED_MS + DAY_MS)).toBeUndefined();
    });

    it('never returns a request that belongs to someone else', () => {
        const requests = {domainAccountMergeRequest_1: buildRequest({requesterAccountID: 2})};

        expect(getOutstandingDomainAccountMergeRequest(requests, REQUESTER_ACCOUNT_ID, CREATED_MS)).toBeUndefined();
        expect(getOutstandingDomainAccountMergeRequest(requests, undefined, CREATED_MS)).toBeUndefined();
    });

    it('prefers the latest to expire and skips removed or incomplete entries', () => {
        const requests = {
            domainAccountMergeRequest_1: buildRequest(),
            domainAccountMergeRequest_2: buildRequest({requestID: '2', created: '2026-11-06 01:00:00.000'}),
            domainAccountMergeRequest_3: undefined,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            domainAccountMergeRequest_4: {} as DomainAccountMergeRequest,
        };

        expect(getOutstandingDomainAccountMergeRequest(requests, REQUESTER_ACCOUNT_ID, CREATED_MS)?.requestID).toBe('2');
    });

    it('treats an unparsable generation time as not outstanding', () => {
        const requests = {domainAccountMergeRequest_1: buildRequest({created: 'not a date'})};

        expect(getOutstandingDomainAccountMergeRequest(requests, REQUESTER_ACCOUNT_ID, CREATED_MS)).toBeUndefined();
    });
});

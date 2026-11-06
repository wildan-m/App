import {canDecideDomainAccountMergeRequest, getReviewableDomainAccountMergeRequests, getSettledDomainAccountMergeRequests} from '@libs/DomainAccountMergeRequestUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequest} from '@src/types/onyx';
import type Domain from '@src/types/onyx/Domain';

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const DOMAIN_ID = 100;
const OTHER_DOMAIN_ID = 200;
const ADMIN_ID = 1;
const ADMIN_LOGIN = 'admin@example.com';
const REQUESTER_ID = 2;

function toDBTime(timestamp: number): string {
    return new Date(timestamp).toISOString().replace('T', ' ').replace('Z', '');
}

function buildRequest(overrides: Partial<DomainAccountMergeRequest> = {}): DomainAccountMergeRequest {
    return {
        requestID: '1',
        requesterAccountID: REQUESTER_ID,
        sourceLogin: 'source@example.com',
        targetLogin: 'target@example.com',
        domainAccountID: DOMAIN_ID,
        created: toDBTime(NOW - 1000),
        ...overrides,
    };
}

function buildCollection(...requests: DomainAccountMergeRequest[]) {
    return Object.fromEntries(requests.map((request) => [`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${request.requestID}`, request]));
}

function buildDomain(adminAccountIDs: number[], validated = true): Domain {
    const adminEntries = Object.fromEntries(adminAccountIDs.map((accountID) => [`${CONST.DOMAIN.EXPENSIFY_ADMIN_ACCESS_PREFIX}${accountID}`, accountID]));
    return {validated, ...adminEntries} as unknown as Domain;
}

describe('DomainAccountMergeRequestUtils', () => {
    describe('getReviewableDomainAccountMergeRequests', () => {
        it('lists only the requests of the given domain', () => {
            // Given requests for two domains
            const requests = buildCollection(buildRequest({requestID: '1'}), buildRequest({requestID: '2', domainAccountID: OTHER_DOMAIN_ID}));

            // When the requests for one domain's page are read
            const result = getReviewableDomainAccountMergeRequests(requests, DOMAIN_ID, ADMIN_ID, NOW);

            // Then a request for the other domain doesn't leak onto this page
            expect(result.map((request) => request.requestID)).toEqual(['1']);
        });

        it('stops listing a request exactly 24 hours after it was generated', () => {
            // Given a request generated exactly 24 hours ago and one generated a second later
            const expiredCreated = NOW - CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.EXPIRATION_MS;
            const requests = buildCollection(buildRequest({requestID: '1', created: toDBTime(expiredCreated)}), buildRequest({requestID: '2', created: toDBTime(expiredCreated + 1000)}));

            // When the requests are read
            const result = getReviewableDomainAccountMergeRequests(requests, DOMAIN_ID, ADMIN_ID, NOW);

            // Then only the request still inside its 24-hour lifetime is listed
            expect(result.map((request) => request.requestID)).toEqual(['2']);
        });

        it("hides the current user's own request and resolved records", () => {
            // Given the current user's own request and a request whose decision the server already accepted
            const requests = buildCollection(
                buildRequest({requestID: '1', requesterAccountID: ADMIN_ID}),
                buildRequest({requestID: '2', resolvedDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED}),
            );

            // When the requests are read
            const result = getReviewableDomainAccountMergeRequests(requests, DOMAIN_ID, ADMIN_ID, NOW);

            // Then neither is offered for review
            expect(result).toEqual([]);
        });

        it('sorts the request that expires soonest first', () => {
            // Given two requests generated at different times
            const requests = buildCollection(buildRequest({requestID: 'newer', created: toDBTime(NOW - 1000)}), buildRequest({requestID: 'older', created: toDBTime(NOW - 5000)}));

            // When the requests are read
            const result = getReviewableDomainAccountMergeRequests(requests, DOMAIN_ID, ADMIN_ID, NOW);

            // Then the first entry drives the expiry timer, so it must be the earliest to expire
            expect(result.map((request) => request.requestID)).toEqual(['older', 'newer']);
        });
    });

    describe('getSettledDomainAccountMergeRequests', () => {
        it('returns resolved records and fragments left by a server removal, but not pending requests', () => {
            // Given a pending request, a resolved record, and the fragment failureData leaves on a key the server removed
            const fragment = {requestID: '3', domainAccountID: DOMAIN_ID, errors: {1: 'error'}} as unknown as DomainAccountMergeRequest;
            const requests = buildCollection(buildRequest({requestID: '1'}), buildRequest({requestID: '2', resolvedDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.DENIED}), fragment);

            // When the settled records are read
            const result = getSettledDomainAccountMergeRequests(requests, DOMAIN_ID);

            // Then the pending request stays and the other two are ready to be confirmed and removed
            expect(result.map((request) => request.requestID)).toEqual(['2', '3']);
        });
    });

    describe('canDecideDomainAccountMergeRequest', () => {
        const crossDomainRequest = buildRequest({targetDomainAccountID: OTHER_DOMAIN_ID});
        const crossDomainParams = {
            request: crossDomainRequest,
            currentUserAccountID: ADMIN_ID,
            currentUserLogin: ADMIN_LOGIN,
            sourceDomain: buildDomain([ADMIN_ID]),
            targetDomain: buildDomain([ADMIN_ID]),
            sourceDomainTechnicalContactEmail: ADMIN_LOGIN,
            targetDomainTechnicalContactEmail: ADMIN_LOGIN,
        };

        it('lets a current domain admin decide a same-domain request', () => {
            // Given a same-domain request and a current admin who isn't the technical contact
            // When the permission is checked
            const result = canDecideDomainAccountMergeRequest({
                ...crossDomainParams,
                request: buildRequest(),
                targetDomain: undefined,
                sourceDomainTechnicalContactEmail: 'other@example.com',
                targetDomainTechnicalContactEmail: undefined,
            });

            // Then adminship of the domain is enough
            expect(result).toBe(true);
        });

        it('refuses a same-domain request for someone who is no longer an admin', () => {
            // Given a member whose adminship was revoked
            // When the permission is checked
            const result = canDecideDomainAccountMergeRequest({...crossDomainParams, request: buildRequest(), sourceDomain: buildDomain([])});

            // Then the controls are not offered
            expect(result).toBe(false);
        });

        it('lets the shared technical contact administering both verified domains decide a cross-domain request', () => {
            // Given the current user is admin and technical contact of both verified domains
            // When the permission is checked
            const result = canDecideDomainAccountMergeRequest(crossDomainParams);

            // Then they can decide it
            expect(result).toBe(true);
        });

        it.each([
            ['not an admin of the target domain', {targetDomain: buildDomain([])}],
            ['not an admin of the source domain', {sourceDomain: buildDomain([])}],
            ['not the technical contact of the target domain', {targetDomainTechnicalContactEmail: 'other@example.com'}],
            ['not the technical contact of the source domain', {sourceDomainTechnicalContactEmail: 'other@example.com'}],
            ['facing an unverified target domain', {targetDomain: buildDomain([ADMIN_ID], false)}],
            ['facing an unverified source domain', {sourceDomain: buildDomain([ADMIN_ID], false)}],
        ])('refuses a cross-domain request for someone %s', (_description, overrides) => {
            // Given one of the cross-domain requirements doesn't hold
            // When the permission is checked
            const result = canDecideDomainAccountMergeRequest({...crossDomainParams, ...overrides});

            // Then adminship of one domain alone doesn't grant approval
            expect(result).toBe(false);
        });
    });
});

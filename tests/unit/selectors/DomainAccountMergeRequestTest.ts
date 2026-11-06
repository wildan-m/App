import DateUtils from '@libs/DateUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {CardFeeds, Domain, DomainAccountMergeRequest} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {
    canDecideDomainAccountMergeRequest,
    getActionableDomainAccountMergeRequests,
    getDomainAccountMergeRequestExpirationTime,
    getNextDomainAccountMergeRequestExpirationTime,
    getRequesterDomainAccountMergeRequest,
    getReviewableDomainAccountMergeRequests,
    getSettledDomainAccountMergeRequests,
    isOutstandingDomainAccountMergeRequest,
} from '@selectors/DomainAccountMergeRequest';

const ADMIN_ID = 1;
const ADMIN_LOGIN = 'admin@source.com';
const REQUESTER_ID = 2;
const SOURCE_DOMAIN_ID = 100;
const TARGET_DOMAIN_ID = 200;
const NOW = new Date('2026-11-06T12:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;

function buildRequest(overrides: Partial<DomainAccountMergeRequest> = {}): DomainAccountMergeRequest {
    return {
        requestID: '1',
        requesterAccountID: REQUESTER_ID,
        sourceLogin: 'old@source.com',
        targetLogin: 'new@source.com',
        domainAccountID: SOURCE_DOMAIN_ID,
        created: DateUtils.getDBTime(NOW - HOUR),
        ...overrides,
    };
}

function buildDomain(accountID: number, adminAccountID: number, validated = true): Domain {
    return {
        accountID,
        validated,
        email: `+@${accountID}.com`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        domain_defaultSecurityGroupID: '',
        [`${CONST.DOMAIN.EXPENSIFY_ADMIN_ACCESS_PREFIX}0`]: adminAccountID,
    } as unknown as Domain;
}

function buildTechnicalContactNVP(email: string): CardFeeds {
    return {settings: {technicalContactEmail: email}} as unknown as CardFeeds;
}

function toRequests(...requests: DomainAccountMergeRequest[]): OnyxCollection<DomainAccountMergeRequest> {
    return Object.fromEntries(requests.map((request) => [`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${request.requestID}`, request]));
}

const crossDomainDecisionParams = {
    currentUserAccountID: ADMIN_ID,
    currentUserLogin: ADMIN_LOGIN,
    sourceDomain: buildDomain(SOURCE_DOMAIN_ID, ADMIN_ID),
    targetDomain: buildDomain(TARGET_DOMAIN_ID, ADMIN_ID),
    sourceDomainMemberSharedNVP: buildTechnicalContactNVP(ADMIN_LOGIN),
    targetDomainMemberSharedNVP: buildTechnicalContactNVP(ADMIN_LOGIN),
    request: buildRequest({targetDomainAccountID: TARGET_DOMAIN_ID}),
};

describe('DomainAccountMergeRequest selectors', () => {
    describe('isOutstandingDomainAccountMergeRequest', () => {
        it('is outstanding right up to 24 hours from generation and not at the boundary', () => {
            const request = buildRequest({created: DateUtils.getDBTime(NOW)});
            const expirationTime = getDomainAccountMergeRequestExpirationTime(request);

            expect(expirationTime).toBe(NOW + 24 * HOUR);
            expect(isOutstandingDomainAccountMergeRequest(request, expirationTime - 1)).toBe(true);
            expect(isOutstandingDomainAccountMergeRequest(request, expirationTime)).toBe(false);
        });

        it('ignores records that are not pending requests and fails closed on an unparsable time', () => {
            expect(isOutstandingDomainAccountMergeRequest(undefined, NOW)).toBe(false);
            expect(isOutstandingDomainAccountMergeRequest({errors: {}} as unknown as DomainAccountMergeRequest, NOW)).toBe(false);
            expect(isOutstandingDomainAccountMergeRequest(buildRequest({resolution: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.APPROVED}), NOW)).toBe(false);
            expect(isOutstandingDomainAccountMergeRequest(buildRequest({created: 'not a date'}), NOW)).toBe(false);
        });

        it('keeps a request with a resolution in flight outstanding, so a failed action never hides it', () => {
            expect(isOutstandingDomainAccountMergeRequest(buildRequest({pendingResolution: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.DENIED}), NOW)).toBe(true);
        });
    });

    describe('getRequesterDomainAccountMergeRequest', () => {
        it('returns only the requester own unexpired request', () => {
            const own = buildRequest({requestID: 'own'});
            const other = buildRequest({requestID: 'other', requesterAccountID: 99});
            const expired = buildRequest({requestID: 'expired', created: DateUtils.getDBTime(NOW - 25 * HOUR)});

            expect(getRequesterDomainAccountMergeRequest(toRequests(other, expired, own), REQUESTER_ID, NOW)).toBe(own);
            expect(getRequesterDomainAccountMergeRequest(toRequests(other, expired), REQUESTER_ID, NOW)).toBeUndefined();
            expect(getRequesterDomainAccountMergeRequest(toRequests(own), undefined, NOW)).toBeUndefined();
        });

        it('prefers the latest to expire when the server sent more than one', () => {
            const older = buildRequest({requestID: 'older', created: DateUtils.getDBTime(NOW - 3 * HOUR)});
            const newer = buildRequest({requestID: 'newer', created: DateUtils.getDBTime(NOW - HOUR)});

            expect(getRequesterDomainAccountMergeRequest(toRequests(older, newer), REQUESTER_ID, NOW)).toBe(newer);
        });
    });

    describe('getReviewableDomainAccountMergeRequests', () => {
        it('lists the domain outstanding requests, soonest to expire first, without the reviewer own request', () => {
            const later = buildRequest({requestID: 'later', created: DateUtils.getDBTime(NOW - HOUR)});
            const sooner = buildRequest({requestID: 'sooner', created: DateUtils.getDBTime(NOW - 3 * HOUR)});
            const otherDomain = buildRequest({requestID: 'otherDomain', domainAccountID: TARGET_DOMAIN_ID});
            const own = buildRequest({requestID: 'own', requesterAccountID: ADMIN_ID});

            expect(getReviewableDomainAccountMergeRequests(toRequests(later, sooner, otherDomain, own), SOURCE_DOMAIN_ID, ADMIN_ID, NOW)).toEqual([sooner, later]);
        });
    });

    describe('getSettledDomainAccountMergeRequests', () => {
        it('returns records that only need confirming and removing, leaving pending requests out', () => {
            const accepted = buildRequest({requestID: 'accepted', resolution: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.DENIED});
            const removedByServer = {requestID: 'removed', domainAccountID: SOURCE_DOMAIN_ID, errors: {}} as unknown as DomainAccountMergeRequest;
            const pending = buildRequest({requestID: 'pending'});

            expect(getSettledDomainAccountMergeRequests(toRequests(accepted, removedByServer, pending), SOURCE_DOMAIN_ID)).toEqual([accepted, removedByServer]);
        });
    });

    describe('getNextDomainAccountMergeRequestExpirationTime', () => {
        it('returns the earliest expiry among outstanding requests and nothing once none remain', () => {
            const sooner = buildRequest({requestID: 'sooner', created: DateUtils.getDBTime(NOW - 3 * HOUR)});
            const later = buildRequest({requestID: 'later', created: DateUtils.getDBTime(NOW - HOUR)});
            const expired = buildRequest({requestID: 'expired', created: DateUtils.getDBTime(NOW - 25 * HOUR)});

            expect(getNextDomainAccountMergeRequestExpirationTime(toRequests(later, expired, sooner), NOW)).toBe(NOW + 21 * HOUR);
            expect(getNextDomainAccountMergeRequestExpirationTime(toRequests(expired), NOW)).toBeUndefined();
        });
    });

    describe('canDecideDomainAccountMergeRequest', () => {
        it('lets a current admin decide a same-domain request and nobody else', () => {
            const sameDomainParams = {...crossDomainDecisionParams, request: buildRequest(), targetDomain: undefined};

            expect(canDecideDomainAccountMergeRequest(sameDomainParams)).toBe(true);
            expect(canDecideDomainAccountMergeRequest({...sameDomainParams, sourceDomain: buildDomain(SOURCE_DOMAIN_ID, 99)})).toBe(false);
        });

        it('lets the shared technical contact administering both verified domains decide a cross-domain request', () => {
            expect(canDecideDomainAccountMergeRequest(crossDomainDecisionParams)).toBe(true);
            expect(canDecideDomainAccountMergeRequest({...crossDomainDecisionParams, currentUserLogin: ADMIN_LOGIN.toUpperCase()})).toBe(true);
        });

        it.each([
            ['the user only administers the target domain', {sourceDomain: buildDomain(SOURCE_DOMAIN_ID, 99)}],
            ['the user only administers the source domain', {targetDomain: buildDomain(TARGET_DOMAIN_ID, 99)}],
            ['the source domain is not verified', {sourceDomain: buildDomain(SOURCE_DOMAIN_ID, ADMIN_ID, false)}],
            ['the target domain is not verified', {targetDomain: buildDomain(TARGET_DOMAIN_ID, ADMIN_ID, false)}],
            ['the user is not the source technical contact', {sourceDomainMemberSharedNVP: buildTechnicalContactNVP('other@source.com')}],
            ['the user is not the target technical contact', {targetDomainMemberSharedNVP: buildTechnicalContactNVP('other@target.com')}],
            ['the technical contact is unknown', {targetDomainMemberSharedNVP: undefined}],
        ])('refuses a cross-domain request when %s', (_, overrides) => {
            expect(canDecideDomainAccountMergeRequest({...crossDomainDecisionParams, ...overrides})).toBe(false);
        });
    });

    describe('getActionableDomainAccountMergeRequests', () => {
        const domains: OnyxCollection<Domain> = {
            [`${ONYXKEYS.COLLECTION.DOMAIN}${SOURCE_DOMAIN_ID}`]: buildDomain(SOURCE_DOMAIN_ID, ADMIN_ID),
            [`${ONYXKEYS.COLLECTION.DOMAIN}${TARGET_DOMAIN_ID}`]: buildDomain(TARGET_DOMAIN_ID, ADMIN_ID),
        };
        const baseParams = {domains, domainMemberSharedNVPs: {}, currentUserAccountID: ADMIN_ID, currentUserLogin: ADMIN_LOGIN, now: NOW};

        it('counts decidable requests across domains and reports each domain once', () => {
            const requests = toRequests(buildRequest({requestID: 'a'}), buildRequest({requestID: 'b'}), buildRequest({requestID: 'c', domainAccountID: TARGET_DOMAIN_ID}));

            const result = getActionableDomainAccountMergeRequests({...baseParams, requests});

            expect(result.count).toBe(3);
            expect(result.domainAccountIDs).toEqual([SOURCE_DOMAIN_ID, TARGET_DOMAIN_ID]);
        });

        it('leaves out requests the user cannot act on right now', () => {
            const requests = toRequests(
                buildRequest({requestID: 'own', requesterAccountID: ADMIN_ID}),
                buildRequest({requestID: 'expired', created: DateUtils.getDBTime(NOW - 25 * HOUR)}),
                buildRequest({requestID: 'inFlight', pendingResolution: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.APPROVED}),
                buildRequest({requestID: 'crossDomain', targetDomainAccountID: TARGET_DOMAIN_ID}),
                buildRequest({requestID: 'unknownDomain', domainAccountID: 300}),
                buildRequest({requestID: 'noDomain', domainAccountID: undefined}),
            );

            expect(getActionableDomainAccountMergeRequests({...baseParams, requests})).toEqual({count: 0, domainAccountIDs: []});
        });

        it('counts a cross-domain request for the shared technical contact', () => {
            const requests = toRequests(buildRequest({targetDomainAccountID: TARGET_DOMAIN_ID}));
            const domainMemberSharedNVPs = {
                [`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${SOURCE_DOMAIN_ID}`]: buildTechnicalContactNVP(ADMIN_LOGIN),
                [`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${TARGET_DOMAIN_ID}`]: buildTechnicalContactNVP(ADMIN_LOGIN),
            };

            expect(getActionableDomainAccountMergeRequests({...baseParams, requests, domainMemberSharedNVPs})).toEqual({count: 1, domainAccountIDs: [SOURCE_DOMAIN_ID]});
        });
    });
});

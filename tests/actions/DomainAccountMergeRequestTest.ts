import * as API from '@libs/API';
import {WRITE_COMMANDS} from '@libs/API/types';

import {
    approveDomainAccountMergeRequest,
    cancelDomainAccountMergeRequest,
    clearCreateDomainAccountMergeRequestErrors,
    clearDomainAccountMergeRequestErrors,
    createDomainAccountMergeRequest,
    denyDomainAccountMergeRequest,
    removeDomainAccountMergeRequest,
} from '@userActions/DomainAccountMergeRequest';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequest} from '@src/types/onyx';

import type {OnyxUpdate} from 'react-native-onyx';

import {getSettledDomainAccountMergeRequests, isOutstandingDomainAccountMergeRequest} from '@selectors/DomainAccountMergeRequest';
import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

jest.mock('@libs/API', () => ({write: jest.fn()}));

const REQUEST_ID = '123';
const DOMAIN_ID = 100;
const REQUEST_KEY = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${REQUEST_ID}` as const;
const NOW = new Date('2026-11-06T12:00:00.000Z').getTime();
const REQUEST: DomainAccountMergeRequest = {
    requestID: REQUEST_ID,
    requesterAccountID: 2,
    sourceLogin: 'old@source.com',
    domainAccountID: DOMAIN_ID,
    created: '2026-11-06 11:00:00.000',
};

type CapturedOnyxData = Partial<Record<'optimisticData' | 'successData' | 'failureData' | 'finallyData', Array<OnyxUpdate<typeof REQUEST_KEY | typeof ONYXKEYS.ACCOUNT>>>>;

function getWriteCall() {
    const [command, parameters, onyxData] = (API.write as jest.Mock).mock.calls.at(0) as [string, unknown, CapturedOnyxData];
    return {command, parameters, onyxData};
}

async function apply(updates: CapturedOnyxData[keyof CapturedOnyxData]) {
    await Onyx.update(updates ?? []);
    await waitForBatchedUpdates();
}

async function getRecord() {
    return (await OnyxUtils.get(REQUEST_KEY)) ?? undefined;
}

async function getCreateState() {
    const account = await OnyxUtils.get(ONYXKEYS.ACCOUNT);
    return account?.createDomainAccountMergeRequest;
}

describe('DomainAccountMergeRequest actions', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    describe('createDomainAccountMergeRequest', () => {
        it('writes no record of its own, so nothing looks pending until the server has accepted the request', async () => {
            createDomainAccountMergeRequest('old@source.com', '123456');
            const {command, parameters, onyxData} = getWriteCall();

            expect(command).toBe(WRITE_COMMANDS.CREATE_DOMAIN_ACCOUNT_MERGE_REQUEST);
            expect(parameters).toEqual({email: 'old@source.com', validateCode: '123456'});

            await apply(onyxData.optimisticData);
            expect(await getRecord()).toBeUndefined();
            expect(await getCreateState()).toMatchObject({isLoading: true});
        });

        it('stops loading and keeps the error on failure, and a retry clears it', async () => {
            createDomainAccountMergeRequest('old@source.com', '123456');
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            await apply(onyxData.failureData);
            await apply(onyxData.finallyData);
            const failedState = await getCreateState();
            expect(failedState?.isLoading).toBe(false);
            expect(Object.keys((failedState?.errors as Record<string, unknown>) ?? {})).toHaveLength(1);

            await apply(onyxData.optimisticData);
            expect((await getCreateState())?.errors).toBeUndefined();

            clearCreateDomainAccountMergeRequestErrors();
            await waitForBatchedUpdates();
            expect((await getCreateState())?.errors).toBeUndefined();
        });

        it('stops loading on a 460, which skips failureData', async () => {
            createDomainAccountMergeRequest('old@source.com', '123456');
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            await apply(onyxData.finallyData);

            expect((await getCreateState())?.isLoading).toBe(false);
        });
    });

    describe.each([
        ['approve', approveDomainAccountMergeRequest, WRITE_COMMANDS.APPROVE_DOMAIN_ACCOUNT_MERGE_REQUEST, CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.APPROVED],
        ['deny', denyDomainAccountMergeRequest, WRITE_COMMANDS.DENY_DOMAIN_ACCOUNT_MERGE_REQUEST, CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.DENIED],
    ] as const)('%s', (_, action, expectedCommand, resolution) => {
        beforeEach(async () => {
            await Onyx.set(REQUEST_KEY, REQUEST);
            await waitForBatchedUpdates();
        });

        it('sends only the request ID, with no validate code or approval-link token', () => {
            action(REQUEST_ID, DOMAIN_ID);
            const {command, parameters} = getWriteCall();

            expect(command).toBe(expectedCommand);
            expect(parameters).toEqual({requestID: REQUEST_ID});
        });

        it('keeps the request pending while in flight, then settles it on success', async () => {
            action(REQUEST_ID, DOMAIN_ID);
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            const inFlight = await getRecord();
            expect(inFlight?.pendingResolution).toBe(resolution);
            expect(isOutstandingDomainAccountMergeRequest(inFlight, NOW)).toBe(true);

            await apply(onyxData.successData);
            await apply(onyxData.finallyData);
            const settled = await getRecord();
            expect(settled?.resolution).toBe(resolution);
            expect(settled?.pendingResolution).toBeUndefined();
            expect(isOutstandingDomainAccountMergeRequest(settled, NOW)).toBe(false);
            expect(getSettledDomainAccountMergeRequests({[REQUEST_KEY]: settled}, DOMAIN_ID)).toHaveLength(1);

            removeDomainAccountMergeRequest(REQUEST_ID);
            await waitForBatchedUpdates();
            expect(await getRecord()).toBeUndefined();
        });

        it('keeps a failed request pending with an error, and a retry or dismissal clears it', async () => {
            action(REQUEST_ID, DOMAIN_ID);
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            await apply(onyxData.failureData);
            await apply(onyxData.finallyData);
            const failed = await getRecord();
            expect(failed?.pendingResolution).toBeUndefined();
            expect(Object.keys(failed?.errors ?? {})).toHaveLength(1);
            expect(isOutstandingDomainAccountMergeRequest(failed, NOW)).toBe(true);

            clearDomainAccountMergeRequestErrors(REQUEST_ID);
            await waitForBatchedUpdates();
            expect((await getRecord())?.errors).toBeUndefined();
        });

        it('does not leave a spinner on a 460, which skips failureData', async () => {
            action(REQUEST_ID, DOMAIN_ID);
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            await apply(onyxData.finallyData);

            expect((await getRecord())?.pendingResolution).toBeUndefined();
        });

        it('settles instead of reviving the request when another admin acted first and the server removed it', async () => {
            action(REQUEST_ID, DOMAIN_ID);
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            await apply([{onyxMethod: Onyx.METHOD.SET, key: REQUEST_KEY, value: null}]);
            await apply(onyxData.failureData);
            await apply(onyxData.finallyData);

            const fragment = await getRecord();
            expect(isOutstandingDomainAccountMergeRequest(fragment, NOW)).toBe(false);
            expect(getSettledDomainAccountMergeRequests({[REQUEST_KEY]: fragment}, DOMAIN_ID)).toHaveLength(1);
        });
    });

    describe('cancelDomainAccountMergeRequest', () => {
        beforeEach(async () => {
            await Onyx.set(REQUEST_KEY, REQUEST);
            await waitForBatchedUpdates();
        });

        it('keeps the request until the server confirms, then removes it so the user can request again', async () => {
            cancelDomainAccountMergeRequest(REQUEST_ID);
            const {command, parameters, onyxData} = getWriteCall();
            expect(command).toBe(WRITE_COMMANDS.CANCEL_DOMAIN_ACCOUNT_MERGE_REQUEST);
            expect(parameters).toEqual({requestID: REQUEST_ID});

            await apply(onyxData.optimisticData);
            const inFlight = await getRecord();
            expect(inFlight?.pendingResolution).toBe(CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.RESOLUTION.CANCELLED);
            expect(isOutstandingDomainAccountMergeRequest(inFlight, NOW)).toBe(true);

            await apply(onyxData.successData);
            expect(await getRecord()).toBeUndefined();
        });

        it('keeps the request pending with an error on failure', async () => {
            cancelDomainAccountMergeRequest(REQUEST_ID);
            const {onyxData} = getWriteCall();

            await apply(onyxData.optimisticData);
            await apply(onyxData.failureData);

            const failed = await getRecord();
            expect(failed?.pendingResolution).toBeUndefined();
            expect(Object.keys(failed?.errors ?? {})).toHaveLength(1);
            expect(isOutstandingDomainAccountMergeRequest(failed, NOW)).toBe(true);
        });
    });
});

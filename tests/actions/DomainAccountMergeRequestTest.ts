import * as API from '@libs/API';
import {WRITE_COMMANDS} from '@libs/API/types';

import {approveDomainAccountMergeRequest, denyDomainAccountMergeRequest} from '@userActions/DomainAccountMergeRequest';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxUpdate} from 'react-native-onyx';

jest.mock('@libs/API', () => ({write: jest.fn()}));

const REQUEST_ID = '123';
const DOMAIN_ID = 100;
const REQUEST_KEY = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${REQUEST_ID}`;

type CapturedOnyxData = Record<'optimisticData' | 'successData' | 'failureData' | 'finallyData', Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST>>>;

function getWriteCall() {
    const [command, parameters, onyxData] = (API.write as jest.Mock).mock.calls.at(0) as [string, unknown, CapturedOnyxData];
    return {command, parameters, onyxData};
}

describe('DomainAccountMergeRequest actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('keeps the record while an approval is in flight and marks it resolved only on success', () => {
        // When an admin approves a request
        approveDomainAccountMergeRequest(REQUEST_ID, DOMAIN_ID);
        const {command, parameters, onyxData} = getWriteCall();

        // Then the approve command runs with no method that removes the record optimistically, so a failure can't hide a pending request
        expect(command).toBe(WRITE_COMMANDS.APPROVE_DOMAIN_ACCOUNT_MERGE_REQUEST);
        expect(parameters).toEqual({requestID: REQUEST_ID});
        expect(onyxData.optimisticData).toEqual([{onyxMethod: 'merge', key: REQUEST_KEY, value: {pendingDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED, errors: null}}]);

        // And the decision the page growls about is written only by successData
        expect(onyxData.successData.at(0)?.value).toMatchObject({resolvedDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED});
        expect(onyxData.failureData.at(0)?.value).not.toHaveProperty('resolvedDecision');
    });

    it('sends the deny command and records the denial on success', () => {
        // When an admin denies a request
        denyDomainAccountMergeRequest(REQUEST_ID, DOMAIN_ID);
        const {command, onyxData} = getWriteCall();

        // Then the deny command runs and successData records a denial, which is what makes the page show the danger growl
        expect(command).toBe(WRITE_COMMANDS.DENY_DOMAIN_ACCOUNT_MERGE_REQUEST);
        expect(onyxData.successData.at(0)?.value).toMatchObject({resolvedDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.DENIED});
    });

    it('surfaces failures on the row and clears the in-flight state outside failureData', () => {
        // When an admin approves a request
        approveDomainAccountMergeRequest(REQUEST_ID, DOMAIN_ID);
        const {onyxData} = getWriteCall();

        // Then failureData adds an error to the row
        expect(onyxData.failureData.at(0)?.value).toHaveProperty('errors');

        // And finallyData clears the spinner, because a 460 response skips failureData
        expect(onyxData.finallyData.at(0)?.value).toMatchObject({pendingDecision: null});
    });
});

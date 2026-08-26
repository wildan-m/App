import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import PreserveKnownLogin from '@libs/Middleware/PreserveKnownLogin';
import {isRecord} from '@libs/ObjectUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList} from '@src/types/onyx';
import type Request from '@src/types/onyx/Request';
import type Response from '@src/types/onyx/Response';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const KNOWN_ACCOUNT_ID = 21641355;
const PRIMARY_LOGIN = 'contact+primary@example.com';
const SECONDARY_LOGIN = 'contact+secondary@example.com';

let requestIndex = 0;

function buildRequest(command: string, data: Record<string, unknown>): Request<OnyxKey> {
    requestIndex += 1;
    return {command, data, requestIndex};
}

function buildPersonalDetailsResponse(personalDetails: Record<string, Record<string, unknown>>): Response<OnyxKey> {
    return {
        jsonCode: 200,
        onyxData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                value: personalDetails,
            },
        ],
    };
}

function getMergedPersonalDetail(response: Response<OnyxKey> | void, accountID: number): Record<string, unknown> | undefined {
    const update = response?.onyxData?.find((onyxUpdate) => onyxUpdate.key === ONYXKEYS.PERSONAL_DETAILS_LIST);
    const personalDetails: unknown = update?.value;
    if (!isRecord(personalDetails)) {
        return undefined;
    }
    const detail = personalDetails[accountID];
    return isRecord(detail) ? detail : undefined;
}

describe('PreserveKnownLogin middleware', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {
            [KNOWN_ACCOUNT_ID]: {accountID: KNOWN_ACCOUNT_ID, login: PRIMARY_LOGIN, displayName: 'Known Contact'},
        } as PersonalDetailsList);
        await waitForBatchedUpdates();
    });

    it('keeps the stored primary login when a report search echoes a secondary login of a known account', async () => {
        const request = buildRequest(READ_COMMANDS.SEARCH_FOR_REPORTS, {searchInput: SECONDARY_LOGIN});
        const response = buildPersonalDetailsResponse({
            [KNOWN_ACCOUNT_ID]: {accountID: KNOWN_ACCOUNT_ID, login: SECONDARY_LOGIN, displayName: 'Known Contact', isFromServerSearch: true},
        });

        const result = await PreserveKnownLogin(Promise.resolve(response), request, false);

        const merged = getMergedPersonalDetail(result, KNOWN_ACCOUNT_ID);
        expect(merged).toBeDefined();
        expect(merged).not.toHaveProperty('login');
        expect(merged?.isFromServerSearch).toBe(true);
        expect(merged?.displayName).toBe('Known Contact');
    });

    it('keeps the stored primary login when a chat is opened by a secondary login of a known account', async () => {
        const request = buildRequest(WRITE_COMMANDS.OPEN_REPORT, {reportID: '1', emailList: `${SECONDARY_LOGIN.toUpperCase()},other@example.com`});
        const response = buildPersonalDetailsResponse({
            [KNOWN_ACCOUNT_ID]: {accountID: KNOWN_ACCOUNT_ID, login: SECONDARY_LOGIN},
        });

        const result = await PreserveKnownLogin(Promise.resolve(response), request, false);

        expect(getMergedPersonalDetail(result, KNOWN_ACCOUNT_ID)).not.toHaveProperty('login');
    });

    it('applies the login of an account the client does not know yet', async () => {
        const unknownAccountID = 987654;
        const request = buildRequest(READ_COMMANDS.SEARCH_FOR_REPORTS, {searchInput: SECONDARY_LOGIN});
        const response = buildPersonalDetailsResponse({
            [unknownAccountID]: {accountID: unknownAccountID, login: SECONDARY_LOGIN},
        });

        const result = await PreserveKnownLogin(Promise.resolve(response), request, false);

        expect(getMergedPersonalDetail(result, unknownAccountID)?.login).toBe(SECONDARY_LOGIN);
    });

    it('lets the server settle an optimistic personal detail', async () => {
        const optimisticAccountID = 1097349758;
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {
            [optimisticAccountID]: {accountID: optimisticAccountID, login: 'typo@example.com', isOptimisticPersonalDetail: true},
        } as PersonalDetailsList);
        await waitForBatchedUpdates();
        const request = buildRequest(WRITE_COMMANDS.OPEN_REPORT, {reportID: '1', emailList: SECONDARY_LOGIN});
        const response = buildPersonalDetailsResponse({
            [optimisticAccountID]: {accountID: optimisticAccountID, login: SECONDARY_LOGIN},
        });

        const result = await PreserveKnownLogin(Promise.resolve(response), request, false);

        expect(getMergedPersonalDetail(result, optimisticAccountID)?.login).toBe(SECONDARY_LOGIN);
    });

    it('applies a login that is not an echo of the lookup', async () => {
        const request = buildRequest(READ_COMMANDS.SEARCH_FOR_REPORTS, {searchInput: 'known'});
        const response = buildPersonalDetailsResponse({
            [KNOWN_ACCOUNT_ID]: {accountID: KNOWN_ACCOUNT_ID, login: SECONDARY_LOGIN},
        });

        const result = await PreserveKnownLogin(Promise.resolve(response), request, false);

        expect(getMergedPersonalDetail(result, KNOWN_ACCOUNT_ID)?.login).toBe(SECONDARY_LOGIN);
    });

    it('ignores requests that do not look accounts up by login', async () => {
        const request = buildRequest(WRITE_COMMANDS.OPEN_APP, {});
        const response = buildPersonalDetailsResponse({
            [KNOWN_ACCOUNT_ID]: {accountID: KNOWN_ACCOUNT_ID, login: SECONDARY_LOGIN},
        });

        const result = await PreserveKnownLogin(Promise.resolve(response), request, false);

        expect(getMergedPersonalDetail(result, KNOWN_ACCOUNT_ID)?.login).toBe(SECONDARY_LOGIN);
    });
});

import {act, renderHook} from '@testing-library/react-native';

import useDomainAccountMergeRequests from '@hooks/useDomainAccountMergeRequests';

import DateUtils from '@libs/DateUtils';
import Visibility from '@libs/Visibility';

import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequest} from '@src/types/onyx';

import {getRequesterDomainAccountMergeRequest} from '@selectors/DomainAccountMergeRequest';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const mockIsBetaEnabled = jest.fn(() => true);
jest.mock('@hooks/usePermissions', () => ({
    __esModule: true,
    default: () => ({isBetaEnabled: () => mockIsBetaEnabled()}),
}));

let mockVisibilityCallback: (() => void) | undefined;
jest.mock('@libs/Visibility', () => ({
    __esModule: true,
    default: {
        isVisible: jest.fn(() => true),
        hasFocus: jest.fn(() => true),
        onVisibilityChange: jest.fn((callback: () => void) => {
            mockVisibilityCallback = callback;
            return jest.fn();
        }),
    },
}));

const REQUESTER_ID = 2;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const START = new Date('2026-11-06T12:00:00.000Z').getTime();
const REQUEST_KEY = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}1` as const;

function buildRequest(created: number): DomainAccountMergeRequest {
    return {requestID: '1', requesterAccountID: REQUESTER_ID, sourceLogin: 'old@source.com', domainAccountID: 100, created: DateUtils.getDBTime(created)};
}

/** waitForBatchedUpdates runs every pending fake timer, which would fire the hook's expiry timer and jump the clock past the expiry under test. */
async function flushOnyx() {
    await act(async () => {
        await jest.advanceTimersByTimeAsync(10);
    });
}

function getOutstanding(result: {current: ReturnType<typeof useDomainAccountMergeRequests>}) {
    return getRequesterDomainAccountMergeRequest(result.current.requests, REQUESTER_ID, result.current.now);
}

describe('useDomainAccountMergeRequests', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));

    beforeEach(async () => {
        jest.useFakeTimers({now: START});
        mockIsBetaEnabled.mockReturnValue(true);
        mockVisibilityCallback = undefined;
        await act(async () => {
            await Onyx.clear();
        });
        await waitForBatchedUpdatesWithAct();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('stops returning a request the moment it expires, with no Onyx update', async () => {
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest(START - 23 * HOUR));
        });
        const {result} = renderHook(() => useDomainAccountMergeRequests());
        await flushOnyx();
        expect(getOutstanding(result)).toBeDefined();

        act(() => {
            jest.advanceTimersByTime(HOUR - MINUTE);
        });
        expect(getOutstanding(result)).toBeDefined();

        act(() => {
            jest.advanceTimersByTime(MINUTE);
        });
        expect(getOutstanding(result)).toBeUndefined();
    });

    it('catches up when the app returns from the background, where timers do not run reliably', async () => {
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest(START - 23 * HOUR));
        });
        const {result} = renderHook(() => useDomainAccountMergeRequests());
        await flushOnyx();
        expect(Visibility.onVisibilityChange).toHaveBeenCalled();
        expect(getOutstanding(result)).toBeDefined();

        act(() => {
            jest.setSystemTime(START + 2 * HOUR);
            mockVisibilityCallback?.();
        });

        expect(getOutstanding(result)).toBeUndefined();
    });

    it('does not extend expiry when a surface mounts later', async () => {
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest(START - 25 * HOUR));
        });
        const {result} = renderHook(() => useDomainAccountMergeRequests());
        await flushOnyx();

        expect(result.current.requests).toBeDefined();
        expect(getOutstanding(result)).toBeUndefined();
    });

    it('returns no requests with the beta off and keeps them in Onyx, so turning it back on restores what is still unexpired', async () => {
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest(START - HOUR));
        });
        mockIsBetaEnabled.mockReturnValue(false);
        const {result, rerender} = renderHook(() => useDomainAccountMergeRequests());
        await flushOnyx();
        expect(result.current.requests).toBeUndefined();

        mockIsBetaEnabled.mockReturnValue(true);
        rerender({});
        await flushOnyx();
        expect(getOutstanding(result)).toBeDefined();
    });

    it('picks up a request arriving through a live update and clears it when the server removes it', async () => {
        const {result} = renderHook(() => useDomainAccountMergeRequests());
        await flushOnyx();
        expect(getOutstanding(result)).toBeUndefined();

        await act(async () => {
            await Onyx.update([{onyxMethod: Onyx.METHOD.SET, key: REQUEST_KEY, value: buildRequest(START)}]);
        });
        await flushOnyx();
        expect(getOutstanding(result)).toBeDefined();

        await act(async () => {
            await Onyx.update([{onyxMethod: Onyx.METHOD.SET, key: REQUEST_KEY, value: null}]);
        });
        await flushOnyx();
        expect(getOutstanding(result)).toBeUndefined();
    });
});

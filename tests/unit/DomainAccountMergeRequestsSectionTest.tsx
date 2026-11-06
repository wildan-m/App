import {act, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import Growl from '@libs/Growl';

import DomainAccountMergeRequestsSection from '@pages/domain/Members/AccountMergeRequests/DomainAccountMergeRequestsSection';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequest} from '@src/types/onyx';

import React from 'react';
import Onyx from 'react-native-onyx';

jest.mock('@libs/Growl', () => ({
    __esModule: true,
    default: {success: jest.fn(), error: jest.fn(), show: jest.fn()},
}));

const mockIsBetaEnabled = jest.fn(() => true);
jest.mock('@hooks/usePermissions', () => ({
    __esModule: true,
    default: () => ({isBetaEnabled: mockIsBetaEnabled}),
}));

jest.mock('@pages/domain/Members/AccountMergeRequests/DomainAccountMergeRequestRow', () => {
    const {Text} = jest.requireActual<typeof import('react-native')>('react-native');
    return {
        __esModule: true,
        default: ({requestID}: {requestID: string}) => <Text>{`row-${requestID}`}</Text>,
    };
});

const DOMAIN_ID = 100;
const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const REQUEST_KEY = `${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}1` as const;

function toDBTime(timestamp: number): string {
    return new Date(timestamp).toISOString().replace('T', ' ').replace('Z', '');
}

function buildRequest(overrides: Partial<DomainAccountMergeRequest> = {}): DomainAccountMergeRequest {
    return {requestID: '1', requesterAccountID: 2, sourceLogin: 'source@example.com', domainAccountID: DOMAIN_ID, created: toDBTime(NOW - 1000), ...overrides};
}

// waitForBatchedUpdates runs pending timers when the clock is fake, which would fire the expiry timer these tests rely on.
async function flushUpdates() {
    await act(async () => {
        await new Promise((resolve) => {
            setImmediate(resolve);
        });
    });
}

function renderSection() {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <DomainAccountMergeRequestsSection domainAccountID={DOMAIN_ID} />
        </ComposeProviders>,
    );
}

describe('DomainAccountMergeRequestsSection', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.useFakeTimers({now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask']});
        mockIsBetaEnabled.mockReturnValue(true);
        await act(async () => {
            await Onyx.clear();
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('removes a row at the moment it expires with no Onyx update', async () => {
        // Given a request generated one second ago
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest());
        });
        renderSection();
        await flushUpdates();
        expect(screen.getByText('row-1')).toBeTruthy();

        // When its 24-hour lifetime runs out while the page stays open
        act(() => {
            jest.advanceTimersByTime(CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.EXPIRATION_MS);
        });

        // Then the row is gone even though nothing changed in Onyx
        expect(screen.queryByText('row-1')).toBeNull();
    });

    it('shows nothing when the beta is off, without touching the stored request', async () => {
        // Given a pending request and the rollout beta turned off
        mockIsBetaEnabled.mockReturnValue(false);
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest());
        });

        // When the section renders
        renderSection();
        await flushUpdates();

        // Then nothing is shown and no growl fires
        expect(screen.queryByText('row-1')).toBeNull();
        expect(Growl.success).not.toHaveBeenCalled();
    });

    it('shows a success growl once and removes the record after a confirmed approval', async () => {
        // Given a pending request on screen
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest());
        });
        renderSection();
        await flushUpdates();
        expect(Growl.success).not.toHaveBeenCalled();

        // When successData records the approval
        await act(async () => {
            await Onyx.merge(REQUEST_KEY, {resolvedDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED});
        });
        await flushUpdates();

        // Then the success growl shows once, the row leaves, and the record is removed
        expect(Growl.success).toHaveBeenCalledTimes(1);
        expect(Growl.error).not.toHaveBeenCalled();
        expect(screen.queryByText('row-1')).toBeNull();
        expect(await Onyx.get(REQUEST_KEY)).toBeUndefined();
    });

    it('shows a danger growl after a confirmed denial', async () => {
        // Given a pending request on screen
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest());
        });
        renderSection();
        await flushUpdates();

        // When successData records the denial
        await act(async () => {
            await Onyx.merge(REQUEST_KEY, {resolvedDecision: CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.DENIED});
        });
        await flushUpdates();

        // Then the danger growl shows
        expect(Growl.error).toHaveBeenCalledTimes(1);
        expect(Growl.success).not.toHaveBeenCalled();
    });

    it('keeps the row when an action fails on a request that is still pending', async () => {
        // Given a pending request on screen
        await act(async () => {
            await Onyx.set(REQUEST_KEY, buildRequest());
        });
        renderSection();
        await flushUpdates();

        // When failureData adds an error to the record
        await act(async () => {
            await Onyx.merge(REQUEST_KEY, {errors: {1: 'error'}});
        });
        await flushUpdates();

        // Then the row stays, with no growl claiming the request was resolved
        expect(screen.getByText('row-1')).toBeTruthy();
        expect(Growl.success).not.toHaveBeenCalled();
        expect(Growl.error).not.toHaveBeenCalled();
    });

    it('tells the admin when another admin acted first', async () => {
        // Given the server removed the request and failureData merged an error onto the removed key
        await act(async () => {
            await Onyx.merge(REQUEST_KEY, {requestID: '1', domainAccountID: DOMAIN_ID, errors: {1: 'error'}});
        });

        // When the section renders
        renderSection();
        await flushUpdates();

        // Then the admin learns the request is gone and the leftover record is removed
        expect(Growl.error).toHaveBeenCalledTimes(1);
        expect(await Onyx.get(REQUEST_KEY)).toBeUndefined();
    });

    it('removes a leftover record silently when there is nothing to tell the admin', async () => {
        // Given finallyData merged onto a key the server removed, as happens on a 460 response
        await act(async () => {
            await Onyx.merge(REQUEST_KEY, {requestID: '1', domainAccountID: DOMAIN_ID});
        });

        // When the section renders
        renderSection();
        await flushUpdates();

        // Then the record is removed with no growl
        expect(Growl.success).not.toHaveBeenCalled();
        expect(Growl.error).not.toHaveBeenCalled();
        expect(await Onyx.get(REQUEST_KEY)).toBeUndefined();
    });
});

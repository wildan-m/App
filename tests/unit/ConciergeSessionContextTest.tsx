import {act, renderHook} from '@testing-library/react-native';

import DateUtils from '@libs/DateUtils';
import {getNewestNonPendingActionCreated} from '@libs/ReportActionsUtils';

import {ConciergeSessionProvider, useConciergeSessionActions, useConciergeSessionState} from '@pages/inbox/ConciergeSessionContext';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction} from '@src/types/onyx';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// Log pulls in the network stack, which loops back into NetworkState during module init.
jest.mock('@src/libs/Log');

const CURRENT_USER_ACCOUNT_ID = 1;
const CONCIERGE_ACCOUNT_ID = 2;

// The device is an hour behind the server, so a server-anchored timestamp lands an hour before the
// timestamps the same device stamped on the history it already sent.
const TIME_SKEW_MS = -60 * 60 * 1000;

function createAction(created: string, overrides: Partial<ReportAction> = {}): ReportAction {
    return {
        reportActionID: created,
        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
        actorAccountID: CONCIERGE_ACCOUNT_ID,
        created,
        message: [{type: 'COMMENT', html: 'Hi', text: 'Hi'}],
        ...overrides,
    } as ReportAction;
}

function renderConciergeSession() {
    return renderHook(() => ({state: useConciergeSessionState(), actions: useConciergeSessionActions()}), {
        wrapper: ({children}: {children: React.ReactNode}) => <ConciergeSessionProvider>{children}</ConciergeSessionProvider>,
    });
}

describe('getNewestNonPendingActionCreated', () => {
    it('returns the newest action already in the report', () => {
        const actions = [createAction('2026-01-02 00:00:00.000'), createAction('2026-01-01 00:00:00.000')];

        expect(getNewestNonPendingActionCreated(actions, CURRENT_USER_ACCOUNT_ID)).toBe('2026-01-02 00:00:00.000');
    });

    it('ignores the synthetic CREATED action', () => {
        const actions = [createAction('2026-01-03 00:00:00.000', {actionName: CONST.REPORT.ACTIONS.TYPE.CREATED}), createAction('2026-01-01 00:00:00.000')];

        expect(getNewestNonPendingActionCreated(actions, CURRENT_USER_ACCOUNT_ID)).toBe('2026-01-01 00:00:00.000');
    });

    it("ignores the current user's optimistic send so a question asked as the session starts stays in the session", () => {
        const actions = [
            createAction('2026-01-03 00:00:00.000', {actorAccountID: CURRENT_USER_ACCOUNT_ID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD}),
            createAction('2026-01-01 00:00:00.000'),
        ];

        expect(getNewestNonPendingActionCreated(actions, CURRENT_USER_ACCOUNT_ID)).toBe('2026-01-01 00:00:00.000');
    });

    it("keeps the current user's already synced messages, which are history", () => {
        const actions = [createAction('2026-01-03 00:00:00.000', {actorAccountID: CURRENT_USER_ACCOUNT_ID}), createAction('2026-01-01 00:00:00.000')];

        expect(getNewestNonPendingActionCreated(actions, CURRENT_USER_ACCOUNT_ID)).toBe('2026-01-03 00:00:00.000');
    });
});

describe('ConciergeSessionProvider', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID});
        await Onyx.merge(ONYXKEYS.NETWORK, {timeSkew: TIME_SKEW_MS});
        await waitForBatchedUpdates();
    });

    it('starts the session after the history already in the report when the skew puts the anchored time behind it', async () => {
        // History the device stamped with its own clock, which the negative skew places ahead of the anchored "now".
        const newestExistingActionCreated = DateUtils.getDBTime();
        const {result} = renderConciergeSession();

        act(() => {
            result.current.actions.startSession(undefined, newestExistingActionCreated);
        });
        await waitForBatchedUpdates();

        // Everything already in the report sorts before the boundary, so it is treated as pre-session history:
        // the Concierge chat hides it and renders the "Show history" button.
        expect(result.current.state.sessionStartTime).not.toBeNull();
        expect(result.current.state.sessionStartTime?.localeCompare(newestExistingActionCreated)).toBeGreaterThan(0);
    });

    it('leaves the boundary on the server-anchored time when the history is older than it', async () => {
        const newestExistingActionCreated = '2020-01-01 00:00:00.000';
        const {result} = renderConciergeSession();

        act(() => {
            result.current.actions.startSession(undefined, newestExistingActionCreated);
        });
        await waitForBatchedUpdates();

        // The floor is in the past, so the clamp is a no-op and the skew correction PR #94814 added still applies.
        const anchoredNow = new Date(Date.now() + TIME_SKEW_MS).toISOString().replace('T', ' ').replace('Z', '');
        expect(result.current.state.sessionStartTime?.slice(0, 13)).toBe(anchoredNow.slice(0, 13));
    });

    it('keeps reaching back to an unread boundary so unread messages stay visible', async () => {
        const unreadBoundary = '2020-01-01 00:00:00.000';
        const newestExistingActionCreated = DateUtils.getDBTime();
        const {result} = renderConciergeSession();

        act(() => {
            result.current.actions.startSession(unreadBoundary, newestExistingActionCreated);
        });
        await waitForBatchedUpdates();

        expect(result.current.state.sessionStartTime).toBe(unreadBoundary);
    });
});

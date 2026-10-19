import {getReasonAndReportActionThatRequiresAttention} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction} from '@src/types/onyx';

import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

import createRandomReportAction from '../utils/collections/reportActions';
import {createRandomReport} from '../utils/collections/reports';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const currentUserEmail = 'approver@test.com';
const currentUserAccountID = 7;
const travelerAccountID = 11;

const WORKSPACE_CHAT_ID = 104401;
const TRIP_ROOM_ID = 104402;

const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function buildWorkspaceChat(isApproverParticipant: boolean): Report {
    return {
        ...createRandomReport(WORKSPACE_CHAT_ID, CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT),
        type: CONST.REPORT.TYPE.CHAT,
        participants: {
            [travelerAccountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
            ...(isApproverParticipant ? {[currentUserAccountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS}} : {}),
        },
    };
}

function buildTripRoom(): Report {
    return {
        ...createRandomReport(TRIP_ROOM_ID, CONST.REPORT.CHAT_TYPE.TRIP_ROOM),
        type: CONST.REPORT.TYPE.CHAT,
        parentReportID: String(WORKSPACE_CHAT_ID),
        transactionCount: 0,
        participants: {
            [travelerAccountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
            // Approvers are added to trip rooms as hidden
            [currentUserAccountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN},
        },
    };
}

function buildTripPreviewAction(): ReportAction {
    return {
        ...createRandomReportAction(1),
        actionName: CONST.REPORT.ACTIONS.TYPE.TRIP_PREVIEW,
        childReportID: String(TRIP_ROOM_ID),
    };
}

async function setBookingApprovalState(approvalState: ValueOf<typeof CONST.TRAVEL.BOOKING_APPROVAL_STATE>, approverAccountIDs: number[], deadline: string) {
    await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${TRIP_ROOM_ID}`, {
        tripData: {
            tripID: 'trip-104418',
            bookingApprovalState: {
                pnr1: {approvalState, approverAccountIDs, deadline},
            },
        },
    });
    await waitForBatchedUpdates();
}

function getReason(report: Report, chat: Report, chatActions?: Record<string, ReportAction>) {
    return getReasonAndReportActionThatRequiresAttention({
        optionOrReport: report,
        currentUserLogin: currentUserEmail,
        currentUserAccountID,
        transactionViolations: undefined,
        reportMetadata: undefined,
        isReportArchived: false,
        reports: {[`${ONYXKEYS.COLLECTION.REPORT}${chat.reportID}`]: chat},
        allReportActions: chatActions ? {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chat.reportID}`]: chatActions} : undefined,
    });
}

describe('Issue 104418 — Inbox Approve badge for travel approvals', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
        return waitForBatchedUpdates();
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.SESSION, {email: currentUserEmail, accountID: currentUserAccountID});
        await waitForBatchedUpdates();
    });

    it('gives the trip room the Approve badge when the approver is not in the workspace chat', async () => {
        // Given a trip room with an outstanding booking awaiting the current user, whose parent workspace chat does not include them
        const chat = buildWorkspaceChat(false);
        const tripRoom = buildTripRoom();
        await setBookingApprovalState(CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING, [currentUserAccountID], futureDeadline);

        // When the attention reason is computed for the trip room
        const result = getReason(tripRoom, chat);

        // Then the trip room itself carries the new reason and the Approve badge, so it surfaces in the Inbox
        expect(result).toHaveProperty('reason', CONST.REQUIRES_ATTENTION_REASONS.HAS_BOOKING_AWAITING_APPROVAL);
        expect(result).toHaveProperty('actionBadge', CONST.REPORT.ACTION_BADGE.APPROVE);
    });

    it('gives the workspace chat the Approve badge through the trip preview when the approver is in the chat', async () => {
        // Given the approver is a participant of the workspace chat, which holds the trip preview of a trip with an outstanding booking
        const chat = buildWorkspaceChat(true);
        const tripRoom = buildTripRoom();
        const tripPreview = buildTripPreviewAction();
        await setBookingApprovalState(CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING, [currentUserAccountID], futureDeadline);

        // When the attention reason is computed for the workspace chat
        const chatResult = getReason(chat, chat, {[tripPreview.reportActionID]: tripPreview});

        // Then the chat carries the Approve badge anchored on the trip preview
        expect(chatResult).toHaveProperty('reason', CONST.REQUIRES_ATTENTION_REASONS.HAS_CHILD_REPORT_AWAITING_ACTION);
        expect(chatResult).toHaveProperty('actionBadge', CONST.REPORT.ACTION_BADGE.APPROVE);
        expect(chatResult?.reportAction?.reportActionID).toBe(tripPreview.reportActionID);

        // And the trip room itself shows nothing, since the badge is already visible on the chat
        const tripRoomResult = getReason(tripRoom, chat);
        expect(tripRoomResult).toBeNull();
    });

    it('shows no badge anywhere once the booking is decided', async () => {
        // Given the booking has been approved (no longer outstanding)
        const chat = buildWorkspaceChat(false);
        const tripRoom = buildTripRoom();
        const tripPreview = buildTripPreviewAction();
        await setBookingApprovalState(CONST.TRAVEL.BOOKING_APPROVAL_STATE.APPROVED, [currentUserAccountID], futureDeadline);

        // When the attention reason is computed for both reports
        // Then neither the trip room nor the chat requires attention, so the room drops out of the Inbox
        expect(getReason(tripRoom, chat)).toBeNull();
        expect(getReason(chat, chat, {[tripPreview.reportActionID]: tripPreview})).toBeNull();
    });

    it('shows no badge when the approval deadline has passed', async () => {
        // Given an outstanding booking whose decision deadline is already in the past
        const chat = buildWorkspaceChat(false);
        const tripRoom = buildTripRoom();
        await setBookingApprovalState(CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING, [currentUserAccountID], pastDeadline);

        // When the attention reason is computed for the trip room
        // Then there is nothing to decide anymore, so no badge shows
        expect(getReason(tripRoom, chat)).toBeNull();
    });

    it('shows no badge to a user who is not an approver of the booking', async () => {
        // Given an outstanding booking that is waiting on somebody else
        const chat = buildWorkspaceChat(false);
        const tripRoom = buildTripRoom();
        await setBookingApprovalState(CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING, [travelerAccountID], futureDeadline);

        // When the attention reason is computed for the trip room
        // Then the current user gets no badge for it
        expect(getReason(tripRoom, chat)).toBeNull();
    });
});

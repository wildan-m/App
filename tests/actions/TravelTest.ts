import {acceptSpotnanaTerms, approveTravelBookings, rejectTravelBooking, setTravelProvisioningTaxID} from '@libs/actions/Travel';
import {makeRequestWithSideEffects, write} from '@libs/API';
import {SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {getIsOffline} from '@libs/NetworkState';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, TravelProvisioning} from '@src/types/onyx';
import type {TripBookingApprovalState} from '@src/types/onyx/ReportNameValuePairs';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import {createRandomReport} from '../utils/collections/reports';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

jest.mock('@libs/API');
jest.mock('@libs/NetworkState', () => ({
    ...jest.requireActual<typeof import('@libs/NetworkState')>('@libs/NetworkState'),
    getIsOffline: jest.fn(() => false),
}));
const mockMakeRequestWithSideEffects = jest.mocked(makeRequestWithSideEffects);
const mockWrite = jest.mocked(write);
const mockGetIsOffline = jest.mocked(getIsOffline);

const DOMAIN = 'example.com';
const POLICY_ID = 'policy-1';
const TAX_ID = 'DE123456789';

describe('actions/Travel', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetIsOffline.mockReturnValue(false);
        return Onyx.clear().then(waitForBatchedUpdates);
    });

    describe('acceptSpotnanaTerms', () => {
        it('forwards the tax ID in the request params and the optimistic policy update', () => {
            acceptSpotnanaTerms(DOMAIN, POLICY_ID, TAX_ID);

            expect(mockMakeRequestWithSideEffects).toHaveBeenCalledWith(
                SIDE_EFFECT_REQUEST_COMMANDS.ACCEPT_SPOTNANA_TERMS,
                {domainName: DOMAIN, policyID: POLICY_ID, taxID: TAX_ID},
                expect.objectContaining({
                    successData: expect.arrayContaining([
                        {
                            onyxMethod: Onyx.METHOD.MERGE,
                            key: `${ONYXKEYS.COLLECTION.POLICY}${POLICY_ID}`,
                            value: {travelSettings: {hasAcceptedTerms: true, taxID: TAX_ID}},
                        },
                    ]),
                }),
            );
        });

        it('omits the tax ID from the policy update when none is provided', () => {
            acceptSpotnanaTerms(DOMAIN, POLICY_ID);

            expect(mockMakeRequestWithSideEffects).toHaveBeenCalledWith(
                SIDE_EFFECT_REQUEST_COMMANDS.ACCEPT_SPOTNANA_TERMS,
                {domainName: DOMAIN, policyID: POLICY_ID, taxID: undefined},
                expect.objectContaining({
                    successData: expect.arrayContaining([
                        {
                            onyxMethod: Onyx.METHOD.MERGE,
                            key: `${ONYXKEYS.COLLECTION.POLICY}${POLICY_ID}`,
                            value: {travelSettings: {hasAcceptedTerms: true}},
                        },
                    ]),
                }),
            );
        });
    });

    describe('setTravelProvisioningTaxID', () => {
        it('stores the tax ID on the travel provisioning session', async () => {
            setTravelProvisioningTaxID(TAX_ID);
            await waitForBatchedUpdates();

            const travelProvisioning = await new Promise<OnyxEntry<TravelProvisioning>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.TRAVEL_PROVISIONING,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });

            expect(travelProvisioning?.taxID).toBe(TAX_ID);
        });
    });

    describe('travel booking decisions', () => {
        const TRIP_ROOM_ID = 104414;
        const APPROVER_ACCOUNT_ID = 7;
        const OTHER_APPROVER_ACCOUNT_ID = 11;
        const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const reportNameValuePairsKey = `${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${TRIP_ROOM_ID}`;
        const reportKey = `${ONYXKEYS.COLLECTION.REPORT}${TRIP_ROOM_ID}`;

        function buildTripRoomReport(hasOutstandingChildRequest: boolean): Report {
            return {
                ...createRandomReport(TRIP_ROOM_ID, CONST.REPORT.CHAT_TYPE.TRIP_ROOM),
                type: CONST.REPORT.TYPE.CHAT,
                hasOutstandingChildRequest,
            };
        }

        function buildOutstandingBooking(approverAccountIDs: number[]): TripBookingApprovalState {
            return {approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING, approverAccountIDs, deadline: futureDeadline};
        }

        function buildTripData(bookingApprovalState: Record<string, TripBookingApprovalState>) {
            return {tripID: 'trip-104414', bookingApprovalState};
        }

        it('approve writes the optimistic status, clears the pending state on success and rolls back with a dismissible error on failure', () => {
            // Given a trip room with one outstanding booking the current user can approve
            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID])});

            // When the approver approves the booking
            approveTravelBookings({tripRoomReport, tripData, pnrIDs: ['pnr1'], currentUserAccountID: APPROVER_ACCOUNT_ID});

            // Then the booking optimistically becomes approved and pending, success only clears the pending state,
            // and failure restores the outstanding status with a dismissible error
            expect(mockWrite).toHaveBeenCalledWith(
                WRITE_COMMANDS.APPROVE_TRAVEL_BOOKINGS,
                {tripRoomReportID: String(TRIP_ROOM_ID), pnrIDs: 'pnr1'},
                expect.objectContaining({
                    optimisticData: expect.arrayContaining([
                        expect.objectContaining({
                            key: reportNameValuePairsKey,
                            value: {
                                tripData: {
                                    bookingApprovalState: {
                                        pnr1: {approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.APPROVED, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE, errors: null},
                                    },
                                },
                            },
                        }),
                    ]),
                    successData: expect.arrayContaining([
                        expect.objectContaining({
                            key: reportNameValuePairsKey,
                            value: {tripData: {bookingApprovalState: {pnr1: {pendingAction: null}}}},
                        }),
                    ]),
                    failureData: expect.arrayContaining([
                        expect.objectContaining({
                            key: reportNameValuePairsKey,
                            value: {
                                tripData: {
                                    bookingApprovalState: {
                                        pnr1: expect.objectContaining({
                                            approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING,
                                            pendingAction: null,
                                            errors: expect.any(Object),
                                        }),
                                    },
                                },
                            },
                        }),
                    ]),
                }),
            );
        });

        it('approve clears the trip room green dot optimistically when the last outstanding booking is decided and restores it on failure', () => {
            // Given a trip room whose only outstanding booking for this approver is the one being decided
            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({
                pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID]),
                pnr2: buildOutstandingBooking([OTHER_APPROVER_ACCOUNT_ID]),
            });

            // When the approver approves it
            approveTravelBookings({tripRoomReport, tripData, pnrIDs: ['pnr1'], currentUserAccountID: APPROVER_ACCOUNT_ID});

            // Then hasOutstandingChildRequest is cleared optimistically and restored by the failure data
            expect(mockWrite).toHaveBeenCalledWith(
                WRITE_COMMANDS.APPROVE_TRAVEL_BOOKINGS,
                expect.anything(),
                expect.objectContaining({
                    optimisticData: expect.arrayContaining([expect.objectContaining({key: reportKey, value: {hasOutstandingChildRequest: false}})]),
                    failureData: expect.arrayContaining([expect.objectContaining({key: reportKey, value: {hasOutstandingChildRequest: true}})]),
                }),
            );
        });

        it('approve leaves the trip room green dot alone while another booking still awaits the approver', () => {
            // Given a trip room where a second booking is still outstanding for the same approver
            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({
                pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID]),
                pnr2: buildOutstandingBooking([APPROVER_ACCOUNT_ID]),
            });

            // When the approver decides only the first booking
            approveTravelBookings({tripRoomReport, tripData, pnrIDs: ['pnr1'], currentUserAccountID: APPROVER_ACCOUNT_ID});

            // Then no update touches the trip room report itself
            const onyxData = mockWrite.mock.calls.at(-1)?.[2];
            expect(onyxData?.optimisticData?.some((update) => update.key === reportKey)).toBeFalsy();
        });

        it('approve sends every booking of an Approve all in one command', () => {
            // Given a trip room with two outstanding bookings for this approver
            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({
                pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID]),
                pnr2: buildOutstandingBooking([APPROVER_ACCOUNT_ID]),
            });

            // When the approver approves all of them at once
            approveTravelBookings({tripRoomReport, tripData, pnrIDs: ['pnr1', 'pnr2'], currentUserAccountID: APPROVER_ACCOUNT_ID});

            // Then one command carries both PNR IDs and both bookings flip optimistically
            expect(mockWrite).toHaveBeenCalledWith(
                WRITE_COMMANDS.APPROVE_TRAVEL_BOOKINGS,
                {tripRoomReportID: String(TRIP_ROOM_ID), pnrIDs: 'pnr1,pnr2'},
                expect.objectContaining({
                    optimisticData: expect.arrayContaining([
                        expect.objectContaining({
                            key: reportNameValuePairsKey,
                            value: {
                                tripData: {
                                    bookingApprovalState: {
                                        pnr1: expect.objectContaining({approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.APPROVED}),
                                        pnr2: expect.objectContaining({approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.APPROVED}),
                                    },
                                },
                            },
                        }),
                    ]),
                }),
            );
        });

        it('reject writes the optimistic rejected status and forwards the reason', () => {
            // Given a trip room with one outstanding booking the current user can approve
            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID])});

            // When the approver rejects the booking with a reason
            rejectTravelBooking({tripRoomReport, tripData, pnrID: 'pnr1', currentUserAccountID: APPROVER_ACCOUNT_ID, reason: 'Too expensive'});

            // Then the command carries the reason and the booking optimistically becomes rejected and pending
            expect(mockWrite).toHaveBeenCalledWith(
                WRITE_COMMANDS.REJECT_TRAVEL_BOOKING,
                {tripRoomReportID: String(TRIP_ROOM_ID), pnrID: 'pnr1', reason: 'Too expensive'},
                expect.objectContaining({
                    optimisticData: expect.arrayContaining([
                        expect.objectContaining({
                            key: reportNameValuePairsKey,
                            value: {
                                tripData: {
                                    bookingApprovalState: {
                                        pnr1: {approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.REJECTED, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE, errors: null},
                                    },
                                },
                            },
                        }),
                    ]),
                }),
            );
        });

        it('approve and reject are blocked offline and never queued', () => {
            // Given the user is offline
            mockGetIsOffline.mockReturnValue(true);
            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID])});

            // When the approver tries to decide a booking either way
            approveTravelBookings({tripRoomReport, tripData, pnrIDs: ['pnr1'], currentUserAccountID: APPROVER_ACCOUNT_ID});
            rejectTravelBooking({tripRoomReport, tripData, pnrID: 'pnr1', currentUserAccountID: APPROVER_ACCOUNT_ID});

            // Then nothing is written: the decision must not replay later, because Spotnana may decide the booking at the deadline in the meantime
            expect(mockWrite).not.toHaveBeenCalled();
        });

        it('a decision patches loaded trip-search snapshots and leaves other snapshots alone', async () => {
            // Given a loaded Spend snapshot for a trip search and one for an expense search
            const tripQueryJSON = buildSearchQueryJSON('type:trip');
            const expenseQueryJSON = buildSearchQueryJSON('type:expense');
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${tripQueryJSON?.hash}`, {search: {inputQuery: 'type:trip'}});
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${expenseQueryJSON?.hash}`, {search: {inputQuery: 'type:expense'}});
            await waitForBatchedUpdates();

            const tripRoomReport = buildTripRoomReport(true);
            const tripData = buildTripData({pnr1: buildOutstandingBooking([APPROVER_ACCOUNT_ID])});

            // When the approver approves the booking
            approveTravelBookings({tripRoomReport, tripData, pnrIDs: ['pnr1'], currentUserAccountID: APPROVER_ACCOUNT_ID});

            // Then the trip snapshot gets the booking's new state merged in, and the expense snapshot is untouched
            const onyxData = mockWrite.mock.calls.at(-1)?.[2];
            const tripSnapshotUpdate = onyxData?.optimisticData?.find((update) => update.key === `${ONYXKEYS.COLLECTION.SNAPSHOT}${tripQueryJSON?.hash}`);
            expect(tripSnapshotUpdate?.value).toEqual({
                data: {
                    [reportNameValuePairsKey]: {
                        tripData: {
                            bookingApprovalState: {
                                pnr1: {approvalState: CONST.TRAVEL.BOOKING_APPROVAL_STATE.APPROVED, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE, errors: null},
                            },
                        },
                    },
                    [reportKey]: {hasOutstandingChildRequest: false},
                },
            });
            expect(onyxData?.optimisticData?.some((update) => update.key === `${ONYXKEYS.COLLECTION.SNAPSHOT}${expenseQueryJSON?.hash}`)).toBeFalsy();
        });
    });
});

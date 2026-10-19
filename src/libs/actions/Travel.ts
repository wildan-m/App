import * as API from '@libs/API';
import type {AcceptSpotnanaTermsParams, ApproveTravelBookingsParams, RejectTravelBookingParams} from '@libs/API/parameters';
import {SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {getIsOffline} from '@libs/NetworkState';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import type {Report, ReportNameValuePairs} from '@src/types/onyx';
import type {TripBookingApprovalState} from '@src/types/onyx/ReportNameValuePairs';

import type {NullishDeep, OnyxEntry, OnyxUpdate} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

import {getTravelDecisionSearchOnyxUpdate} from './IOU/SearchUpdate';

/**
 * Accept Spotnana terms and conditions to receive a proper token used for authenticating further actions
 */
function acceptSpotnanaTerms(domain?: string, policyID?: string, taxID?: string) {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.NVP_TRAVEL_SETTINGS | typeof ONYXKEYS.TRAVEL_PROVISIONING>> = [
        {
            onyxMethod: 'merge',
            key: ONYXKEYS.NVP_TRAVEL_SETTINGS,
            value: {
                hasAcceptedTerms: true,
            },
        },
        {
            onyxMethod: 'merge',
            key: ONYXKEYS.TRAVEL_PROVISIONING,
            value: {
                isLoading: true,
                errors: null,
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.TRAVEL_PROVISIONING | typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: 'merge',
            key: ONYXKEYS.TRAVEL_PROVISIONING,
            value: {
                isLoading: false,
            },
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                travelSettings: {
                    hasAcceptedTerms: true,
                    ...(taxID ? {taxID} : {}),
                },
            },
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.NVP_TRAVEL_SETTINGS | typeof ONYXKEYS.TRAVEL_PROVISIONING>> = [
        {
            onyxMethod: 'merge',
            key: ONYXKEYS.NVP_TRAVEL_SETTINGS,
            value: {
                hasAcceptedTerms: false,
            },
        },
        {
            onyxMethod: 'merge',
            key: ONYXKEYS.TRAVEL_PROVISIONING,
            value: {
                isLoading: false,
            },
        },
    ];

    const params: AcceptSpotnanaTermsParams = {domainName: domain, policyID, taxID};

    // We need to call this API immediately to get the response and open the travel page.
    // See https://github.com/Expensify/App/pull/69769#discussion_r2368967354 for more info.
    // eslint-disable-next-line rulesdir/no-api-side-effects-method
    return API.makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.ACCEPT_SPOTNANA_TERMS, params, {optimisticData, successData, failureData});
}

function requestTravelAccess() {
    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.NVP_TRAVEL_SETTINGS>> = [
        {
            onyxMethod: 'merge',
            key: ONYXKEYS.NVP_TRAVEL_SETTINGS,
            value: {
                lastTravelSignupRequestTime: Date.now().toString(),
            },
        },
    ];
    API.write(WRITE_COMMANDS.TRAVEL_SIGNUP_REQUEST, null, {optimisticData});
}

function setTravelProvisioningTaxID(taxID: string) {
    Onyx.merge(ONYXKEYS.TRAVEL_PROVISIONING, {taxID});
}

function setTravelProvisioningDomain(domain: string) {
    Onyx.merge(ONYXKEYS.TRAVEL_PROVISIONING, {domain});
}

function setTravelProvisioningNextStep(nextStepRoute?: Route) {
    Onyx.merge(ONYXKEYS.TRAVEL_PROVISIONING, {nextStepRoute});
}

function setTravelProvisioningEnabledSteps(enabledSteps: string[]) {
    Onyx.merge(ONYXKEYS.TRAVEL_PROVISIONING, {enabledSteps});
}

function cleanupTravelProvisioningSession() {
    Onyx.merge(ONYXKEYS.TRAVEL_PROVISIONING, null);
}

type TripDataNameValuePairs = NonNullable<ReportNameValuePairs['tripData']>;

type TravelBookingDecisionParams = {
    /** The trip room the decision is made in */
    tripRoomReport: OnyxEntry<Report>;

    /** The trip room's `tripData` name-value pair, holding the per-booking approval state */
    tripData: OnyxEntry<TripDataNameValuePairs>;

    /** Account ID of the approver making the decision */
    currentUserAccountID: number;
};

type ApproveTravelBookingsFunctionParams = TravelBookingDecisionParams & {
    /** PNR IDs of the bookings being approved */
    pnrIDs: string[];
};

type RejectTravelBookingFunctionParams = TravelBookingDecisionParams & {
    /** PNR ID of the booking being rejected */
    pnrID: string;

    /** Optional reason the approver gave for rejecting the booking */
    reason?: string;
};

/**
 * True while the booking still needs a decision from this approver: it is outstanding, its deadline
 * hasn't passed, and the user is one of its approvers.
 */
function isBookingOutstandingForApprover(booking: TripBookingApprovalState | undefined, accountID: number): boolean {
    return (
        booking?.approvalState === CONST.TRAVEL.BOOKING_APPROVAL_STATE.OUTSTANDING &&
        !!booking.deadline &&
        new Date(booking.deadline) > new Date() &&
        !!booking.approverAccountIDs?.includes(accountID)
    );
}

/**
 * Builds the optimistic, success and failure Onyx data for a booking approval decision, following the
 * `approveMoneyRequest` shape: the optimistic data flips the booking's state (pending until the server
 * responds), the failure data restores the previous state with a dismissible error, and — when the
 * decision resolves the approver's last outstanding booking in the trip — the trip room's
 * `hasOutstandingChildRequest` is cleared optimistically so the green dot and the Home count follow.
 * The same merges are fanned into loaded trip-search snapshots so open Spend tables follow too.
 */
function buildTravelDecisionOnyxData(
    tripRoomReport: Report,
    tripData: OnyxEntry<TripDataNameValuePairs>,
    pnrIDs: string[],
    decision: ValueOf<typeof CONST.TRAVEL.BOOKING_APPROVAL_STATE>,
    currentUserAccountID: number,
) {
    const reportNameValuePairsKey = `${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${tripRoomReport.reportID}` as const;
    const reportKey = `${ONYXKEYS.COLLECTION.REPORT}${tripRoomReport.reportID}` as const;

    const optimisticBookings: Record<string, NullishDeep<TripBookingApprovalState>> = {};
    const successBookings: Record<string, NullishDeep<TripBookingApprovalState>> = {};
    const failureBookings: Record<string, NullishDeep<TripBookingApprovalState>> = {};
    for (const pnrID of pnrIDs) {
        optimisticBookings[pnrID] = {approvalState: decision, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE, errors: null};
        successBookings[pnrID] = {pendingAction: null};
        failureBookings[pnrID] = {
            approvalState: tripData?.bookingApprovalState?.[pnrID]?.approvalState ?? null,
            pendingAction: null,
            errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
        };
    }

    // When no other booking in the trip still awaits this approver, the decision also clears the trip
    // room's green dot (and with it the Home approve count) without waiting for the server.
    const hasRemainingOutstandingBooking = Object.entries(tripData?.bookingApprovalState ?? {}).some(
        ([pnrID, booking]) => !pnrIDs.includes(pnrID) && isBookingOutstandingForApprover(booking, currentUserAccountID),
    );
    const optimisticReport = hasRemainingOutstandingBooking ? undefined : {hasOutstandingChildRequest: false};
    const failureReport = hasRemainingOutstandingBooking ? undefined : {hasOutstandingChildRequest: tripRoomReport.hasOutstandingChildRequest ?? null};

    type TravelDecisionOnyxKey = typeof ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS | typeof ONYXKEYS.COLLECTION.REPORT | typeof ONYXKEYS.COLLECTION.SNAPSHOT;

    const optimisticData: Array<OnyxUpdate<TravelDecisionOnyxKey>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: reportNameValuePairsKey,
            value: {tripData: {bookingApprovalState: optimisticBookings}},
        },
    ];
    const successData: Array<OnyxUpdate<TravelDecisionOnyxKey>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: reportNameValuePairsKey,
            value: {tripData: {bookingApprovalState: successBookings}},
        },
    ];
    const failureData: Array<OnyxUpdate<TravelDecisionOnyxKey>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: reportNameValuePairsKey,
            value: {tripData: {bookingApprovalState: failureBookings}},
        },
    ];

    if (optimisticReport && failureReport) {
        optimisticData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: reportKey,
            value: optimisticReport,
        });
        failureData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: reportKey,
            value: failureReport,
        });
    }

    const searchUpdate = getTravelDecisionSearchOnyxUpdate({
        tripRoomReportID: tripRoomReport.reportID,
        optimisticReportNameValuePairs: {tripData: {bookingApprovalState: optimisticBookings}},
        failureReportNameValuePairs: {tripData: {bookingApprovalState: failureBookings}},
        optimisticReport,
        failureReport,
    });
    optimisticData.push(...searchUpdate.optimisticData);
    failureData.push(...searchUpdate.failureData);

    return {optimisticData, successData, failureData};
}

/**
 * Approves one or many outstanding travel bookings in a trip room, optimistically flipping every
 * surface that reads the booking approval state. Blocked while offline and never queued: Spotnana may
 * approve or cancel a booking at its deadline in the meantime, so a replayed decision could act on a
 * booking that no longer needs it.
 */
function approveTravelBookings({tripRoomReport, tripData, pnrIDs, currentUserAccountID}: ApproveTravelBookingsFunctionParams) {
    if (getIsOffline() || !tripRoomReport || pnrIDs.length === 0) {
        return;
    }

    const {optimisticData, successData, failureData} = buildTravelDecisionOnyxData(tripRoomReport, tripData, pnrIDs, CONST.TRAVEL.BOOKING_APPROVAL_STATE.APPROVED, currentUserAccountID);
    const params: ApproveTravelBookingsParams = {tripRoomReportID: tripRoomReport.reportID, pnrIDs: pnrIDs.join(',')};
    API.write(WRITE_COMMANDS.APPROVE_TRAVEL_BOOKINGS, params, {optimisticData, successData, failureData});
}

/**
 * Rejects an outstanding travel booking in a trip room with an optional reason, optimistically
 * flipping every surface that reads the booking approval state. Blocked while offline and never
 * queued, for the same reason approvals are.
 */
function rejectTravelBooking({tripRoomReport, tripData, pnrID, currentUserAccountID, reason}: RejectTravelBookingFunctionParams) {
    if (getIsOffline() || !tripRoomReport || !pnrID) {
        return;
    }

    const {optimisticData, successData, failureData} = buildTravelDecisionOnyxData(tripRoomReport, tripData, [pnrID], CONST.TRAVEL.BOOKING_APPROVAL_STATE.REJECTED, currentUserAccountID);
    const params: RejectTravelBookingParams = {tripRoomReportID: tripRoomReport.reportID, pnrID, ...(reason ? {reason} : {})};
    API.write(WRITE_COMMANDS.REJECT_TRAVEL_BOOKING, params, {optimisticData, successData, failureData});
}

/**
 * Clears the error a failed approval decision left on a booking, when the user dismisses it.
 */
function clearTravelBookingDecisionError(tripRoomReportID: string, pnrID: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${tripRoomReportID}`, {
        tripData: {bookingApprovalState: {[pnrID]: {errors: null}}},
    });
}

export {
    acceptSpotnanaTerms,
    approveTravelBookings,
    cleanupTravelProvisioningSession,
    clearTravelBookingDecisionError,
    rejectTravelBooking,
    requestTravelAccess,
    setTravelProvisioningDomain,
    setTravelProvisioningEnabledSteps,
    setTravelProvisioningNextStep,
    setTravelProvisioningTaxID,
};

type RejectTravelBookingParams = {
    /** Report ID of the trip room whose booking is being rejected */
    tripRoomReportID: string;

    /** PNR ID of the booking being rejected */
    pnrID: string;

    /** Optional reason the approver gave for rejecting the booking */
    reason?: string;
};

export default RejectTravelBookingParams;

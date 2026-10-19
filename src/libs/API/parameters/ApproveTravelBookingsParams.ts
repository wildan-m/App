type ApproveTravelBookingsParams = {
    /** Report ID of the trip room whose bookings are being approved */
    tripRoomReportID: string;

    /** Comma-separated PNR IDs of the bookings being approved */
    pnrIDs: string;
};

export default ApproveTravelBookingsParams;

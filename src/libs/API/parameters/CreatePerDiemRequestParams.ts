type CreatePerDiemRequestParams = {
    policyID: string;
    created: string;
    customUnitID: string;
    customUnitRate: string;
    customUnitRateID: string;
    subRates: string;
    currency: string;
    startDateTime: string;
    endDateTime: string;
    category?: string;
    description: string;
    tag?: string;
    iouReportID?: string;
    chatReportID: string;
    transactionID: string;
    reportActionID: string;
    createdChatReportActionID?: string;
    createdIOUReportActionID?: string;
    reportPreviewReportActionID: string;
    transactionThreadReportID?: string;
    createdReportActionIDForThread: string | undefined;
    billable?: boolean;
    reimbursable?: boolean;
    attendees?: string;
    customUnitPolicyID?: string;

    /** When true, the backend defers auto-submit so batch expense creation (e.g. duplicate report) can finish before the report is submitted */
    shouldDeferAutoSubmit?: boolean;

    /** The report action ID of the actionable whisper to dismiss when moving a tracked per diem expense */
    actionableWhisperReportActionID?: string;

    /** The report action ID of the linked tracked expense being moved from self DM */
    linkedTrackedExpenseReportActionID?: string;

    /** The report ID of the self DM where the tracked expense originated */
    linkedTrackedExpenseReportID?: string;
};

export default CreatePerDiemRequestParams;

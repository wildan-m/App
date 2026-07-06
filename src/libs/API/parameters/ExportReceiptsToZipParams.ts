type ExportReceiptsToZipParams = {
    /** JSON-stringified list of report IDs (Reports page) */
    reportIDs?: string;

    /** JSON-stringified list of transaction IDs (Expenses page) */
    transactionIDs?: string;

    /** Client-generated ID used to track the export download */
    exportID: string;
};

export default ExportReceiptsToZipParams;

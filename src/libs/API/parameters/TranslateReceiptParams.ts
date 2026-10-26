type TranslateReceiptParams = {
    transactionID: string;
    receiptID: number;

    /** Language to translate the receipt into, taken from the viewer's language preference */
    targetLanguage: string;
};

export default TranslateReceiptParams;

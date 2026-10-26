import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

/** A single line of a translated receipt, in the order it is printed on the receipt */
type ReceiptTranslationRow = {
    /** How the row is laid out */
    type: ValueOf<typeof CONST.RECEIPT.TRANSLATED_ROW_TYPE>;

    /** Main text of the row (store name, label, item description, ...) */
    text?: string;

    /** Smaller gray second line under an item description, e.g. "2 x 1,50" */
    secondaryText?: string;

    /** Right-aligned value or amount, shown verbatim as printed on the receipt */
    value?: string;

    /** Whether a plain text row is centered instead of left-aligned */
    isCentered?: boolean;

    /** False when the backend returned the line untranslated because its numbers failed verification */
    isTranslated?: boolean;
};

/** One saved translation of a receipt into one language */
type ReceiptTranslationResult = {
    /** Translated rows in printed order */
    rows: ReceiptTranslationRow[];

    /** When the translation was produced */
    translatedAt: string;
};

/** Device-local translations of a transaction's receipt, never shared with other viewers */
type ReceiptTranslation = {
    /** The receiptID the saved translations were produced from; a replaced receipt gets a new ID, which invalidates them */
    receiptID?: number;

    /** Saved translations keyed by the viewer language they were translated into */
    translations?: Record<string, ReceiptTranslationResult>;

    /** Whether a translation request is currently in flight */
    isLoading?: boolean;

    /** Error from the last attempt; cleared on retry or when the receipt modal closes, never persisted */
    errorType?: ValueOf<typeof CONST.RECEIPT.TRANSLATION_ERROR> | null;
};

export default ReceiptTranslation;
export type {ReceiptTranslationRow, ReceiptTranslationResult};

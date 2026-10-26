import * as API from '@libs/API';
import {SIDE_EFFECT_REQUEST_COMMANDS} from '@libs/API/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

type TranslateReceiptArgs = {
    transactionID: string;
    receiptID: number;

    /** Language to translate into, taken from the viewer's language preference */
    targetLanguage: string;

    /** True when the stored record belongs to a previous (since replaced) receipt, so its saved translations must be dropped */
    shouldResetSavedTranslations?: boolean;
};

/**
 * Translates a transaction's receipt into the viewer's language and saves the result on this device.
 * The result is written straight to Onyx, so it is kept even when the viewer closes the receipt modal
 * or leaves the expense before the translation finishes.
 */
function translateReceipt({transactionID, receiptID, targetLanguage, shouldResetSavedTranslations = false}: TranslateReceiptArgs) {
    const onyxKey = `${ONYXKEYS.COLLECTION.RECEIPT_TRANSLATION}${transactionID}` as const;
    if (shouldResetSavedTranslations) {
        Onyx.set(onyxKey, {receiptID, isLoading: true, errorType: null});
    } else {
        Onyx.merge(onyxKey, {receiptID, isLoading: true, errorType: null});
    }

    // The caller needs the translated rows from the response, and saved translations are a per-device cache
    // that other clients must never receive, so this cannot be a regular read or write command.
    // eslint-disable-next-line rulesdir/no-api-side-effects-method
    return API.makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.TRANSLATE_RECEIPT, {transactionID, receiptID, targetLanguage})
        .then((response) => {
            if (response?.jsonCode !== CONST.JSON_CODE.SUCCESS || !response.receiptTranslationRows) {
                const knownErrorTypes: Array<ValueOf<typeof CONST.RECEIPT.TRANSLATION_ERROR>> = [CONST.RECEIPT.TRANSLATION_ERROR.UNREADABLE, CONST.RECEIPT.TRANSLATION_ERROR.SAME_LANGUAGE];
                const errorType = knownErrorTypes.find((type) => type === response?.receiptTranslationErrorType) ?? CONST.RECEIPT.TRANSLATION_ERROR.GENERIC;
                Onyx.merge(onyxKey, {isLoading: false, errorType});
                return;
            }

            Onyx.merge(onyxKey, {
                isLoading: false,
                errorType: null,
                receiptID,
                translations: {
                    [targetLanguage]: {
                        rows: response.receiptTranslationRows,
                        translatedAt: new Date().toISOString(),
                    },
                },
            });
        })
        .catch(() => {
            Onyx.merge(onyxKey, {isLoading: false, errorType: CONST.RECEIPT.TRANSLATION_ERROR.GENERIC});
        });
}

/** Errors are never persisted: they clear when the viewer retries or closes the receipt modal */
function clearReceiptTranslationError(transactionID: string | undefined) {
    if (!transactionID) {
        return;
    }
    Onyx.merge(`${ONYXKEYS.COLLECTION.RECEIPT_TRANSLATION}${transactionID}`, {errorType: null});
}

export {translateReceipt, clearReceiptTranslationError};

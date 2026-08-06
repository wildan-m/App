import isTextInputFocused from '@components/TextInput/BaseTextInput/isTextInputFocused';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useLocalize from '@hooks/useLocalize';
import usePrevious from '@hooks/usePrevious';

import {isMobileSafari} from '@libs/Browser';
import getOperatingSystem from '@libs/getOperatingSystem';
import {
    addLeadingZero,
    handleNegativeAmountFlipping,
    replaceAllDigits,
    replaceCommasWithPeriod,
    stripCommaFromAmount,
    stripDecimalsFromAmount,
    stripSpacesFromAmount,
    validateAmount,
} from '@libs/MoneyRequestUtils';
import shouldIgnoreSelectionWhenUpdatedManually from '@libs/shouldIgnoreSelectionWhenUpdatedManually';

import CONST from '@src/CONST';

import type {NativeSyntheticEvent} from 'react-native';

import {useIsFocused} from '@react-navigation/native';
import {useCallback, useEffect, useRef, useState} from 'react';

type UseNumberFormStateProps = {
    /** Value to display, should already be formatted */
    value?: string;

    /** Callback to update the value in the FormProvider */
    onInputChange?: (number: string) => void;

    /** Number of decimals to display in the number */
    decimals?: number;

    /** Maximum number of characters the value can hold */
    maxLength?: number;

    /** Whether the amount is negative */
    isNegative?: boolean;

    /** Whether to allow flipping amount (enables the toggle mechanism) */
    allowFlippingAmount?: boolean;

    /** Whether to allow direct negative input (for split amounts where value is already negative) */
    allowNegativeInput?: boolean;

    /** Function to toggle the amount to negative */
    toggleNegative?: () => void;

    /** Function to clear the negative amount */
    clearNegative?: () => void;
};

/**
 * Returns the new selection object based on the updated number's length
 */
const getNewSelection = (oldSelection: {start: number; end: number}, prevLength: number, newLength: number) => {
    const cursorPosition = oldSelection.end + (newLength - prevLength);
    return {start: cursorPosition, end: cursorPosition};
};

/**
 * The number-editing engine behind NumberWithSymbolForm.
 *
 * Owns the current number and selection state, input validation, decimal reconciliation,
 * negative-sign handling, forward-delete tracking and big-number-pad key handling —
 * independent of how (or whether) the value is rendered.
 */
function useNumberFormState({
    value: number,
    onInputChange,
    decimals = 0,
    maxLength,
    isNegative = false,
    allowFlippingAmount = false,
    allowNegativeInput = false,
    toggleNegative,
    clearNegative,
}: UseNumberFormStateProps) {
    const {toLocaleDigit} = useLocalize();

    const textInput = useRef<BaseTextInputRef | null>(null);
    const numberRef = useRef<string | undefined>(undefined);
    const [currentNumber, setCurrentNumber] = useState(typeof number === 'string' ? number : '');

    const [shouldUpdateSelection, setShouldUpdateSelection] = useState(true);

    const isFocused = useIsFocused();
    const wasFocused = usePrevious(isFocused);

    const [selection, setSelection] = useState({
        start: currentNumber.length,
        end: currentNumber.length,
    });

    // When the prop resets to empty, mirror that in internal state so the field doesn't stay stuck at "0.00".
    useEffect(() => {
        if (number !== '') {
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing internal state to an externally-driven prop reset (Onyx); mirrors the existing pattern in this file
        setCurrentNumber('');
        setSelection({start: 0, end: 0});
    }, [number]);

    const forwardDeletePressedRef = useRef(false);
    // The ref is used to ignore any onSelectionChange event that happens while we are updating the selection manually in setNewNumber
    const willSelectionBeUpdatedManually = useRef(false);

    const clearSelection = useCallback(() => {
        setSelection({start: selection.end, end: selection.end});
    }, [selection.end]);

    /**
     * Sets the selection and the number accordingly to the number passed to the input
     * @param newNumber - Changed number from user input
     */
    const setNewNumber = useCallback(
        (newNumber: string) => {
            // Remove spaces from the newNumber number because Safari on iOS adds spaces when pasting a copied number
            // More info: https://github.com/Expensify/App/issues/16974
            const newNumberWithoutSpaces = stripSpacesFromAmount(newNumber);
            const rawFinalNumber = newNumberWithoutSpaces.includes('.') ? stripCommaFromAmount(newNumberWithoutSpaces) : replaceCommasWithPeriod(newNumberWithoutSpaces);

            // When allowNegativeInput is true, keep negative sign as-is (for split amounts)
            // When allowFlippingAmount is true, strip the negative sign and call toggleNegative
            const finalNumber = allowNegativeInput ? rawFinalNumber : handleNegativeAmountFlipping(rawFinalNumber, allowFlippingAmount, toggleNegative);

            // Use a shallow copy of selection to trigger setSelection
            // More info: https://github.com/Expensify/App/issues/16385
            if (!validateAmount(finalNumber, decimals, maxLength, allowNegativeInput)) {
                setSelection((prevSelection) => ({...prevSelection}));
                return;
            }

            willSelectionBeUpdatedManually.current = true;
            let hasSelectionBeenSet = false;
            const strippedNumber = stripCommaFromAmount(finalNumber);
            numberRef.current = strippedNumber;
            setCurrentNumber((prevNumber) => {
                const isForwardDelete = prevNumber.length > strippedNumber.length && forwardDeletePressedRef.current;
                if (!hasSelectionBeenSet) {
                    hasSelectionBeenSet = true;
                    setSelection((prevSelection) => getNewSelection(prevSelection, isForwardDelete ? strippedNumber.length : prevNumber.length, strippedNumber.length));
                    willSelectionBeUpdatedManually.current = false;
                }
                return strippedNumber;
            });
            onInputChange?.(strippedNumber);
        },
        [decimals, maxLength, onInputChange, allowFlippingAmount, toggleNegative, allowNegativeInput],
    );

    /**
     * Set a new number number properly formatted, used for the TextInput
     * @param text - Changed text from user input
     */
    const setFormattedNumber = (text: string) => {
        // Remove spaces from the new number because Safari on iOS adds spaces when pasting a copied number
        // More info: https://github.com/Expensify/App/issues/16974
        const newNumberWithoutSpaces = stripSpacesFromAmount(text);
        // When allowNegativeInput is true, keep negative sign as-is
        const replacedCommasNumber = allowNegativeInput
            ? replaceCommasWithPeriod(newNumberWithoutSpaces)
            : handleNegativeAmountFlipping(replaceCommasWithPeriod(newNumberWithoutSpaces), allowFlippingAmount, toggleNegative);

        const withLeadingZero = addLeadingZero(replacedCommasNumber, allowNegativeInput);

        if (!validateAmount(withLeadingZero, decimals, maxLength, allowNegativeInput)) {
            setSelection((prevSelection) => ({...prevSelection}));
            return;
        }

        const strippedNumber = stripCommaFromAmount(withLeadingZero);
        const isForwardDelete = currentNumber.length > strippedNumber.length && forwardDeletePressedRef.current;

        willSelectionBeUpdatedManually.current = true;
        numberRef.current = strippedNumber;
        setCurrentNumber(strippedNumber);
        setSelection(getNewSelection(selection, isForwardDelete ? strippedNumber.length : currentNumber.length, strippedNumber.length));
        onInputChange?.(strippedNumber);
    };

    // Clears text selection if user visits symbol (currency) selector and comes back
    useEffect(() => {
        if (!isFocused || wasFocused) {
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the selection to a navigation focus change; moved verbatim from NumberWithSymbolForm
        clearSelection();
    }, [isFocused, wasFocused, clearSelection]);

    // Modifies the number to match changed decimals.
    useEffect(() => {
        // If the field is intentionally empty (e.g. new manual expense flow before the user enters an amount)
        // or the current number is already valid for the new decimal count, nothing to do.
        if (number === '' || validateAmount(currentNumber, decimals, maxLength, allowNegativeInput || allowFlippingAmount)) {
            return;
        }

        // If the number doesn't support decimals, we can strip the decimals
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reconciling the stored number with an externally-driven decimals change; moved verbatim from NumberWithSymbolForm
        setNewNumber(stripDecimalsFromAmount(currentNumber));

        // we want to update only when decimals change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [decimals]);

    /**
     * Update number with number or Backspace pressed for BigNumberPad.
     * Validate new number with decimal number regex up to 6 digits and 2 decimal digit to enable Next button
     */
    const updateValueNumberPad = useCallback(
        (key: string) => {
            if (shouldUpdateSelection && !isTextInputFocused(textInput)) {
                textInput.current?.focus();
            }
            // Backspace button is pressed
            if (key === '<' || key === 'Backspace') {
                if (currentNumber.length > 0) {
                    const selectionStart = selection.start === selection.end ? selection.start - 1 : selection.start;
                    const newNumber = `${currentNumber.substring(0, selectionStart)}${currentNumber.substring(selection.end)}`;
                    setNewNumber(addLeadingZero(newNumber, allowNegativeInput));
                }
                return;
            }
            const newNumber = addLeadingZero(`${currentNumber.substring(0, selection.start)}${key}${currentNumber.substring(selection.end)}`, allowNegativeInput);
            setNewNumber(newNumber);
        },
        [currentNumber, selection.start, selection.end, shouldUpdateSelection, setNewNumber, allowNegativeInput],
    );

    /**
     * Update long press number, to remove items pressing on <
     *
     * @param value - Changed text from user input
     */
    const updateLongPressHandlerState = useCallback((value: boolean) => {
        setShouldUpdateSelection(!value);
        if (!value && !isTextInputFocused(textInput)) {
            textInput.current?.focus();
        }
    }, []);

    /**
     * Input handler to check for a forward-delete key (or keyboard shortcut) press.
     */
    const textInputKeyPress = (event: NativeSyntheticEvent<KeyboardEvent>) => {
        const key = event.nativeEvent.key.toLowerCase();

        if (!textInput.current?.value && key === 'backspace' && isNegative) {
            clearNegative?.();
        }

        if (isMobileSafari() && key === CONST.PLATFORM_SPECIFIC_KEYS.CTRL.DEFAULT) {
            // Optimistically anticipate forward-delete on iOS Safari (in cases where the Mac Accessibility keyboard is being
            // used for input). If the Control-D shortcut doesn't get sent, the ref will still be reset on the next key press.
            forwardDeletePressedRef.current = true;
            return;
        }
        // Control-D on Mac is a keyboard shortcut for forward-delete. See https://support.apple.com/en-us/HT201236 for Mac keyboard shortcuts.
        // Also check for the keyboard shortcut on iOS in cases where a hardware keyboard may be connected to the device.
        const operatingSystem = getOperatingSystem() as string | null;
        const allowedOS: string[] = [CONST.OS.MAC_OS, CONST.OS.IOS];
        forwardDeletePressedRef.current = key === 'delete' || (allowedOS.includes(operatingSystem ?? '') && event.nativeEvent.ctrlKey && key === 'd');
    };

    /**
     * Updates the number and moves the cursor to the end, used by the imperative handle
     */
    const updateNumber = (newNumber: string) => {
        const updatedNumber = handleNegativeAmountFlipping(newNumber, allowFlippingAmount, toggleNegative);

        setCurrentNumber(updatedNumber);
        setSelection({start: updatedNumber.length, end: updatedNumber.length});
    };

    const formattedNumber = replaceAllDigits(currentNumber, toLocaleDigit);

    const handleSelectionChange = (selectionStart: number, selectionEnd: number) => {
        if (shouldIgnoreSelectionWhenUpdatedManually && willSelectionBeUpdatedManually.current) {
            willSelectionBeUpdatedManually.current = false;
            return;
        }
        if (!shouldUpdateSelection) {
            return;
        }
        // When the number is updated in setNewNumber on iOS, in onSelectionChange formattedNumber stores the number before the update. Using numberRef allows us to read the updated number
        const maxSelection = numberRef.current?.length ?? formattedNumber.length;
        numberRef.current = undefined;
        const start = Math.min(selectionStart, maxSelection);
        const end = Math.min(selectionEnd, maxSelection);
        setSelection({start, end});
    };

    /**
     * Handles pressing the flip button (+/-) to toggle negative sign
     * Only available in displayAsTextInput mode for manual expense flow
     */
    const handleFlipPress = useCallback(() => {
        // Toggle the minus sign prefix in the value
        const isRemovingSign = currentNumber.startsWith('-');
        const newValue = isRemovingSign ? currentNumber.slice(1) : `-${currentNumber}`;
        // Guard the manual selection update the same way setNewNumber/setFormattedNumber do: on native the
        // controlled TextInput can emit onSelectionChange with the stale selection while the value update is
        // applied, which would write the old cursor position back and undo the shift below. numberRef lets
        // handleSelectionChange read the updated value length when computing maxSelection.
        willSelectionBeUpdatedManually.current = true;
        numberRef.current = newValue;
        setCurrentNumber(newValue);
        // Shift the cursor by the length of the toggled sign so it stays in the same logical position
        // relative to the digits (e.g. on an empty field {0,0} -> {1,1}, placing the cursor after the "-").
        // Without this the cursor stays before the "-", so typing produces an invalid string like "5-" that
        // validateAmount rejects, making the entered number disappear.
        const offset = isRemovingSign ? -1 : 1;
        setSelection((prevSelection) => ({
            start: Math.max(prevSelection.start + offset, 0),
            end: Math.max(prevSelection.end + offset, 0),
        }));
        onInputChange?.(newValue);
    }, [currentNumber, onInputChange]);

    return {
        currentNumber,
        formattedNumber,
        selection,
        textInputRef: textInput,
        clearSelection,
        setNewNumber,
        setFormattedNumber,
        updateValueNumberPad,
        updateLongPressHandlerState,
        textInputKeyPress,
        handleSelectionChange,
        handleFlipPress,
        updateNumber,
    };
}

export default useNumberFormState;
export type {UseNumberFormStateProps};

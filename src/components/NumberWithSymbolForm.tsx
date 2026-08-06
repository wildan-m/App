import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import {useMouseActions} from '@hooks/useMouseContext';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import CONST from '@src/CONST';

import type {ForwardedRef} from 'react';
import type {KeyboardTypeOptions, StyleProp, TextStyle, ViewStyle} from 'react-native';

import React, {useImperativeHandle, useMemo} from 'react';
import {View} from 'react-native';

import type {BaseTextInputRef} from './TextInput/BaseTextInput/types';
import type {TextInputWithSymbolProps} from './TextInputWithSymbol/types';

import BigNumberPad from './BigNumberPad';
import Button from './Button';
import FormHelpMessage from './FormHelpMessage';
import useNumberFormState from './NumberForm/useNumberFormState';
import ScrollView from './ScrollView';
import TextInput from './TextInput';
import isTextInputFocused from './TextInput/BaseTextInput/isTextInputFocused';
import TextInputWithCurrencySymbol from './TextInputWithSymbol';

type NumberWithSymbolFormProps = {
    /** Value to display, should already be formatted */
    value?: string;

    /** Callback to update the value in the FormProvider */
    onInputChange?: (number: string) => void;

    /** Number of decimals to display in the number */
    decimals?: number;

    /** Currency of the input */
    currency?: string;

    /** Whether the big number pad should be shown */
    shouldShowBigNumberPad?: boolean;

    /** Footer to display at the bottom of the form */
    footer?: React.ReactNode;

    /** Reference to the number form */
    numberFormRef?: ForwardedRef<NumberWithSymbolFormRef>;

    /** Error to display at the bottom of the form */
    errorText?: string;

    /** Whether the form should use a standard TextInput as a base */
    displayAsTextInput?: boolean;

    /** Custom label for the TextInput */
    label?: string;

    /** Whether to wrap the input in a container */
    shouldWrapInputInContainer?: boolean;

    /** Style applied to the outer ScrollView */
    scrollViewStyle?: StyleProp<ViewStyle>;

    /** Whether to refocus the input when clicking on the ScrollView empty space */
    shouldRefocusOnScrollViewClick?: boolean;

    /** Whether the amount is negative */
    isNegative?: boolean;

    /** Function to toggle the amount to negative */
    toggleNegative?: () => void;

    /** Function to clear the negative amount */
    clearNegative?: () => void;

    /** Whether to allow flipping amount (shows flip button and enables toggle mechanism) */
    allowFlippingAmount?: boolean;

    /** Whether to allow direct negative input (for split amounts where value is already negative) */
    allowNegativeInput?: boolean;

    /** Style for the negative symbol */
    negativeSymbolStyle?: StyleProp<TextStyle>;

    /** Whether to use dynamic font size for the amount input */
    shouldUseDynamicFontSize?: boolean;

    /** Whether the input is disabled or not */
    disabled?: boolean;

    /** Reference to the outer element */
    ref?: ForwardedRef<BaseTextInputRef>;

    /** Callback when the user presses the submit key (Enter) */
    onSubmitEditing?: () => void;

    /** Determines which keyboard to open */
    keyboardType?: KeyboardTypeOptions;

    /** Whether to show the flip (+/-) button */
    shouldShowFlipButton?: boolean;

    /** Whether to show the currency selection button */
    shouldShowCurrencyButton?: boolean;

    /** Callback when currency button is pressed */
    onCurrencyButtonPress?: () => void;

    /**
     * Label on the trailing dropdown button (e.g. currency code). When set, used instead of `currency` so the same control can show a unit or other suffix.
     */
    currencyButtonLabel?: string;

    /** Accessibility label for the trailing dropdown button (defaults to currency-based copy when unset) */
    currencyButtonAccessibilityLabel?: string;
} & Omit<TextInputWithSymbolProps, 'formattedAmount' | 'onAmountChange' | 'placeholder' | 'onSelectionChange' | 'onKeyPress' | 'onMouseDown' | 'onMouseUp'>;

type NumberWithSymbolFormRef = {
    clearSelection: () => void;
    updateNumber: (newNumber: string) => void;
    getNumber: () => string;
};

const canUseTouchScreen = canUseTouchScreenUtil();

const NUMBER_VIEW_ID = 'numberView';
const NUM_PAD_CONTAINER_VIEW_ID = 'numPadContainerView';
const NUM_PAD_VIEW_ID = 'numPadView';

/**
 * Generic number input form with symbol (currency or unit).
 *
 * Can render either a standard TextInput or a number input with BigNumberPad and symbol interaction.
 * Already handles number decimals and input validation.
 */
function NumberWithSymbolForm({
    value: number,
    symbol = '',
    currency = '',
    symbolPosition = CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX,
    hideSymbol = false,
    decimals = 0,
    maxLength,
    errorText,
    onInputChange,
    onSymbolButtonPress,
    isSymbolPressable = true,
    shouldShowBigNumberPad = canUseTouchScreen,
    displayAsTextInput = false,
    footer,
    numberFormRef,
    label,
    style,
    containerStyle,
    symbolTextStyle,
    shouldUseDynamicFontSize = false,
    autoGrow = true,
    disableKeyboard = true,
    prefixCharacter = '',
    hideFocusedState = true,
    shouldApplyPaddingToContainer = false,
    shouldUseDefaultLineHeightForPrefix = true,
    shouldWrapInputInContainer = true,
    scrollViewStyle,
    shouldRefocusOnScrollViewClick = false,
    isNegative = false,
    allowFlippingAmount = false,
    allowNegativeInput = false,
    negativeSymbolStyle,
    toggleNegative,
    clearNegative,
    ref,
    disabled,
    onSubmitEditing,
    shouldShowFlipButton = false,
    shouldShowCurrencyButton = false,
    onCurrencyButtonPress,
    currencyButtonLabel,
    currencyButtonAccessibilityLabel,
    ...props
}: NumberWithSymbolFormProps) {
    const icons = useMemoizedLazyExpensifyIcons(['DownArrow', 'PlusMinus', 'CoinsButton']);
    const isInLandscapeMode = useIsInLandscapeMode();

    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {numberFormat, translate} = useLocalize();

    const {
        currentNumber,
        formattedNumber,
        selection,
        textInputRef,
        clearSelection,
        setNewNumber,
        setFormattedNumber,
        updateValueNumberPad,
        updateLongPressHandlerState,
        textInputKeyPress,
        handleSelectionChange,
        handleFlipPress,
        updateNumber,
    } = useNumberFormState({
        value: number,
        onInputChange,
        decimals,
        maxLength,
        isNegative,
        allowFlippingAmount,
        allowNegativeInput,
        toggleNegative,
        clearNegative,
    });

    const currencyOrUnitButtonText = currencyButtonLabel ?? currency;
    const onTrailingDropdownPress = onCurrencyButtonPress ?? onSymbolButtonPress;

    const {setMouseDown, setMouseUp} = useMouseActions();
    const handleMouseDown = (e: React.MouseEvent<Element, MouseEvent>) => {
        e.stopPropagation();
        setMouseDown();
    };
    const handleMouseUp = (e: React.MouseEvent<Element, MouseEvent>) => {
        e.stopPropagation();
        setMouseUp();
    };

    /**
     * Event occurs when a user presses a mouse button over an DOM element.
     */
    const focusTextInput = (event: React.MouseEvent, ids: string[]) => {
        const relatedTargetId = (event.nativeEvent?.target as HTMLElement)?.id;
        if (!ids.includes(relatedTargetId)) {
            return;
        }

        event.preventDefault();
        clearSelection();

        if (!textInputRef.current) {
            return;
        }
        if (!isTextInputFocused(textInputRef)) {
            textInputRef.current.focus();
        }
    };

    useImperativeHandle(numberFormRef, () => ({
        clearSelection,
        updateNumber,
        getNumber: () => currentNumber,
    }));

    // Calculate dynamic font size based on the total length of the amount display
    const dynamicAmountStyle = useMemo(() => {
        const totalLength = formattedNumber.length + (hideSymbol ? 0 : symbol.length) + (isNegative ? 1 : 0);
        return StyleUtils.getAmountInputFontSize(totalLength);
    }, [StyleUtils, formattedNumber.length, hideSymbol, symbol.length, isNegative]);

    /**
     * Creates the right-hand side component for text input mode
     * Renders flip (+/-) button and/or currency selection button when enabled
     * Only shown when clear button is not visible (see TextInput conditional rendering)
     */
    const textInputRightHandSideComponent = useMemo(() => {
        return (
            <View style={[styles.flexRow, styles.gap2, styles.alignItemsCenter]}>
                {shouldShowFlipButton && allowNegativeInput && canUseTouchScreen && (
                    <Button
                        small
                        icon={icons.PlusMinus}
                        iconAccessibilityLabel={translate('iou.flip')}
                        onPress={handleFlipPress}
                        onMouseDown={(e) => e.preventDefault()}
                        iconWrapperStyles={styles.justifyContentCenter}
                        text={translate('iou.flip')}
                        accessibilityLabel={translate('iou.flip')}
                        isDisabled={disabled}
                    />
                )}
                {shouldShowCurrencyButton && !!currencyOrUnitButtonText && (
                    <Button
                        small
                        icon={icons.CoinsButton}
                        iconAccessibilityLabel={translate('common.currency')}
                        onPress={onTrailingDropdownPress}
                        iconWrapperStyles={styles.justifyContentCenter}
                        text={currencyOrUnitButtonText}
                        accessibilityLabel={currencyButtonAccessibilityLabel ?? `${translate('common.selectCurrency')}, ${currencyOrUnitButtonText}`}
                        isDisabled={disabled}
                    />
                )}
            </View>
        );
    }, [
        shouldShowFlipButton,
        allowNegativeInput,
        disabled,
        shouldShowCurrencyButton,
        styles,
        icons,
        handleFlipPress,
        onTrailingDropdownPress,
        currencyOrUnitButtonText,
        currencyButtonAccessibilityLabel,
        translate,
    ]);

    if (displayAsTextInput) {
        return (
            <TextInput
                label={label}
                accessibilityLabel={label}
                value={formattedNumber}
                onChangeText={setFormattedNumber}
                selection={selection}
                onSelectionChange={(e) => handleSelectionChange(e.nativeEvent.selection.start, e.nativeEvent.selection.end)}
                ref={(newRef: BaseTextInputRef | null) => {
                    if (typeof ref === 'function') {
                        ref(newRef);
                    } else if (ref && 'current' in ref) {
                        // eslint-disable-next-line no-param-reassign
                        ref.current = newRef;
                    }
                    textInputRef.current = newRef;
                }}
                disabled={disabled}
                prefixCharacter={hideSymbol ? '' : symbol}
                prefixStyle={styles.colorMuted}
                keyboardType={props.keyboardType ?? CONST.KEYBOARD_TYPE.DECIMAL_PAD}
                // On android autoCapitalize="words" is necessary when keyboardType="decimal-pad" or inputMode="decimal" to prevent input lag.
                // See https://github.com/Expensify/App/issues/51868 for more information
                autoCapitalize="words"
                inputMode={!props.keyboardType ? CONST.INPUT_MODE.DECIMAL : undefined}
                errorText={errorText}
                style={style}
                autoFocus={props.autoFocus}
                autoGrowExtraSpace={props.autoGrowExtraSpace}
                autoGrowMarginSide={props.autoGrowMarginSide}
                onSubmitEditing={onSubmitEditing}
                onFocus={props.onFocus}
                onBlur={props.onBlur}
                rightHandSideComponent={shouldShowCurrencyButton || shouldShowFlipButton ? textInputRightHandSideComponent : undefined}
            />
        );
    }

    const textInputComponent = (
        <TextInputWithCurrencySymbol
            formattedAmount={formattedNumber}
            onChangeAmount={setNewNumber}
            onSymbolButtonPress={onSymbolButtonPress}
            placeholder={numberFormat(0)}
            ref={(newRef: BaseTextInputRef | null) => {
                if (typeof ref === 'function') {
                    ref(newRef);
                } else if (ref && 'current' in ref) {
                    // eslint-disable-next-line no-param-reassign
                    ref.current = newRef;
                }
                textInputRef.current = newRef;
            }}
            disabled={disabled}
            symbol={symbol}
            hideSymbol={hideSymbol}
            symbolPosition={symbolPosition}
            selection={selection}
            onSelectionChange={handleSelectionChange}
            onKeyPress={textInputKeyPress}
            isSymbolPressable={isSymbolPressable && !shouldWrapInputInContainer}
            symbolTextStyle={[symbolTextStyle, shouldUseDynamicFontSize ? dynamicAmountStyle : undefined]}
            style={[style, shouldUseDynamicFontSize ? dynamicAmountStyle : undefined]}
            containerStyle={containerStyle}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            autoFocus={props.autoFocus}
            autoGrow={autoGrow}
            disableKeyboard={disableKeyboard}
            prefixCharacter={prefixCharacter}
            hideFocusedState={hideFocusedState}
            shouldApplyPaddingToContainer={shouldApplyPaddingToContainer}
            shouldUseDefaultLineHeightForPrefix={shouldUseDefaultLineHeightForPrefix}
            autoGrowExtraSpace={props.autoGrowExtraSpace}
            autoGrowMarginSide={props.autoGrowMarginSide}
            contentWidth={props.contentWidth}
            onPress={props.onPress}
            onBlur={props.onBlur}
            submitBehavior={props.submitBehavior}
            testID={props.testID}
            prefixStyle={props.prefixStyle}
            prefixContainerStyle={props.prefixContainerStyle}
            touchableInputWrapperStyle={props.touchableInputWrapperStyle}
            isNegative={isNegative}
            negativeSymbolStyle={negativeSymbolStyle}
            toggleNegative={toggleNegative}
            onFocus={props.onFocus}
            accessibilityLabel={props.accessibilityLabel}
            keyboardType={props.keyboardType}
            shouldAllowFocusInLandscapeMode
        />
    );

    if (isInLandscapeMode) {
        return (
            <>
                <ScrollView
                    contentContainerStyle={[styles.flexGrow1, styles.flexRow]}
                    style={[styles.flex1, styles.ph5]}
                >
                    <View style={[styles.justifyContentCenter, styles.alignItemsCenter, styles.numberWithSymbolFormInputContainerLandscape]}>
                        <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentCenter]}>{textInputComponent}</View>
                        <View style={[styles.flexRow, styles.justifyContentCenter, styles.gap2]}>
                            {isSymbolPressable && (
                                <Button
                                    small
                                    icon={icons.CoinsButton}
                                    iconAccessibilityLabel={translate('common.currency')}
                                    onPress={onSymbolButtonPress}
                                    style={styles.minWidth18}
                                    iconWrapperStyles={styles.justifyContentCenter}
                                    text={currency}
                                    accessibilityLabel={`${translate('common.selectCurrency')}, ${currency}`}
                                />
                            )}
                            {allowFlippingAmount && (
                                <Button
                                    small
                                    icon={icons.PlusMinus}
                                    iconAccessibilityLabel={translate('iou.flip')}
                                    onPress={toggleNegative}
                                    style={styles.minWidth18}
                                    iconWrapperStyles={styles.justifyContentCenter}
                                    text={translate('iou.flip')}
                                    accessibilityLabel={translate('iou.flip')}
                                />
                            )}
                        </View>
                        {!!errorText && (
                            <FormHelpMessage
                                style={[styles.ph5, styles.w100]}
                                isError
                                message={errorText}
                            />
                        )}
                    </View>

                    {shouldShowBigNumberPad ? (
                        <View
                            style={[styles.flex1, styles.justifyContentCenter]}
                            id={NUM_PAD_CONTAINER_VIEW_ID}
                        >
                            {shouldShowBigNumberPad ? (
                                <BigNumberPad
                                    id={NUM_PAD_VIEW_ID}
                                    numberPressed={updateValueNumberPad}
                                    longPressHandlerStateChanged={updateLongPressHandlerState}
                                />
                            ) : null}
                        </View>
                    ) : null}
                </ScrollView>

                {!!footer && <View style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0]}>{footer}</View>}
            </>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={[styles.flexGrow1, scrollViewStyle]}
            style={[
                !shouldWrapInputInContainer && styles.flexGrow0,
                // Hide pointer cursor when refocus feature is enabled (empty space shouldn't look clickable)
                shouldRefocusOnScrollViewClick && styles.cursorAuto,
            ]}
            onMouseDown={(e) => {
                if (!shouldRefocusOnScrollViewClick) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                textInputRef.current?.focus();
            }}
        >
            {shouldWrapInputInContainer ? (
                <View style={[styles.flex1, styles.justifyContentCenter, styles.alignItemsCenter]}>
                    <View
                        id={NUMBER_VIEW_ID}
                        onMouseDown={(event) => focusTextInput(event, [NUMBER_VIEW_ID])}
                        style={[styles.flex1, styles.w100, styles.alignItemsCenter, styles.justifyContentCenter]}
                    >
                        <View style={[styles.flexRow, styles.moneyRequestAmountContainer, styles.alignItemsCenter, styles.justifyContentCenter]}>{textInputComponent}</View>
                        {isSymbolPressable && !!currency && !canUseTouchScreen && (
                            <Button
                                small
                                icon={icons.CoinsButton}
                                iconAccessibilityLabel={translate('common.currency')}
                                onPress={onSymbolButtonPress}
                                style={styles.minWidth18}
                                iconWrapperStyles={styles.justifyContentCenter}
                                text={currency}
                                accessibilityLabel={`${translate('common.selectCurrency')}, ${currency}`}
                            />
                        )}
                        {!!errorText && (
                            <FormHelpMessage
                                style={[styles.pAbsolute, styles.b0, shouldShowBigNumberPad ? styles.mb5 : styles.mb3, styles.ph5, styles.w100]}
                                isError
                                message={errorText}
                            />
                        )}
                    </View>
                </View>
            ) : (
                textInputComponent
            )}

            <View style={[styles.flexRow, styles.justifyContentCenter, shouldShowBigNumberPad ? styles.mb2 : styles.mb0, styles.gap2]}>
                {isSymbolPressable && canUseTouchScreen && (
                    <Button
                        small
                        icon={icons.CoinsButton}
                        iconAccessibilityLabel={translate('common.currency')}
                        onPress={onSymbolButtonPress}
                        style={styles.minWidth18}
                        iconWrapperStyles={styles.justifyContentCenter}
                        text={currency}
                        accessibilityLabel={`${translate('common.selectCurrency')}, ${currency}`}
                    />
                )}
                {allowFlippingAmount && canUseTouchScreen && (
                    <Button
                        small
                        icon={icons.PlusMinus}
                        iconAccessibilityLabel={translate('iou.flip')}
                        onPress={toggleNegative}
                        style={styles.minWidth18}
                        iconWrapperStyles={styles.justifyContentCenter}
                        text={translate('iou.flip')}
                        accessibilityLabel={translate('iou.flip')}
                    />
                )}
            </View>

            {shouldShowBigNumberPad || !!footer ? (
                <View
                    onMouseDown={(event) => focusTextInput(event, [NUM_PAD_CONTAINER_VIEW_ID, NUM_PAD_VIEW_ID])}
                    style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0]}
                    id={NUM_PAD_CONTAINER_VIEW_ID}
                >
                    {shouldShowBigNumberPad ? (
                        <BigNumberPad
                            id={NUM_PAD_VIEW_ID}
                            numberPressed={updateValueNumberPad}
                            longPressHandlerStateChanged={updateLongPressHandlerState}
                        />
                    ) : null}
                    {footer}
                </View>
            ) : null}
        </ScrollView>
    );
}

export default NumberWithSymbolForm;
export type {NumberWithSymbolFormProps, NumberWithSymbolFormRef};

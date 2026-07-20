import {useShouldUseCompactSearchInput} from '@components/CompactSearchInputContext';
import type {TextInputOptions} from '@components/SelectionList/types';
import Text from '@components/Text';
import BaseTextInput from '@components/TextInput';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useCompactSearchInputStyles from '@hooks/useCompactSearchInputStyles';
import useDebouncedAccessibilityAnnouncement from '@hooks/useDebouncedAccessibilityAnnouncement';
import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import Accessibility from '@libs/Accessibility';
import mergeRefs from '@libs/mergeRefs';

import CONST from '@src/CONST';

import type {TextInputKeyPressEvent} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useRef, useState} from 'react';
import {View} from 'react-native';

type TextInputProps = {
    /** Reference to the BaseTextInput component */
    ref?: React.RefObject<BaseTextInputRef | null> | null;

    /** Configuration options for the text input including label, placeholder, validation, etc. */
    options?: TextInputOptions;

    /**  */
    accessibilityLabel?: string;

    /** Whether the text input is loading */
    isLoading?: boolean;

    /** The number of items in the data array, used to determine submit behavior */
    dataLength?: number;

    /** Callback function called when the text input is submitted */
    onSubmit?: () => void;

    /** Function called when a key is pressed in the text input */
    onKeyPress?: (event: TextInputKeyPressEvent) => void;

    /** Function called when the text input focus changes */
    onFocusChange: (focused: boolean) => void;

    /** Whether to show the text input */
    shouldShowTextInput?: boolean;

    /** Whether to show the loading placeholder */
    shouldShowLoadingPlaceholder?: boolean;

    /** Whether to show the loading indicator for new options */
    isLoadingNewOptions?: boolean;

    /** Function to focus text input component */
    focusTextInput: () => void;
};

function TextInput({
    ref,
    options,
    accessibilityLabel,
    isLoading = false,
    dataLength,
    onSubmit,
    onKeyPress,
    onFocusChange,
    shouldShowLoadingPlaceholder,
    isLoadingNewOptions,
    shouldShowTextInput,
    focusTextInput,
}: TextInputProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {
        label,
        value,
        onChangeText,
        errorText,
        headerMessage,
        hint,
        disableAutoFocus,
        placeholder,
        maxLength,
        inputMode,
        ref: optionsRef,
        style,
        disableAutoCorrect,
        shouldInterceptSwipe,
    } = options ?? {};

    const isInLandscapeMode = useIsInLandscapeMode();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    // Search inputs inside popover menus use the smaller size, so the label is dropped in favour of a
    // placeholder to keep the field short enough for the compact height.
    const shouldUseCompactStyle = useShouldUseCompactSearchInput();
    const [isFocused, setIsFocused] = useState(false);
    const compactSearchInputStyles = useCompactSearchInputStyles(shouldUseNarrowLayout, isFocused);

    const noResultsFoundText = translate('common.noResultsFound');
    const isNoResultsFoundMessage = headerMessage === noResultsFoundText;
    const isScreenReaderEnabled = Accessibility.useScreenReaderStatus();
    const hasNoData = dataLength === 0 && !shouldShowLoadingPlaceholder;
    const shouldShowHeaderMessage = !!shouldShowTextInput && !!headerMessage && (!isLoadingNewOptions || !isNoResultsFoundMessage || hasNoData);
    const trimmedSearchValue = value?.trim() ?? '';
    const suggestionsCount = dataLength ?? 0;
    const suggestionsAnnouncement =
        !!shouldShowTextInput && !shouldShowLoadingPlaceholder && !isLoadingNewOptions && suggestionsCount > 0
            ? translate('search.suggestionsAvailable', {count: suggestionsCount}, trimmedSearchValue)
            : '';

    useDebouncedAccessibilityAnnouncement(headerMessage ?? '', shouldShowHeaderMessage, value ?? '');
    useDebouncedAccessibilityAnnouncement(suggestionsAnnouncement, !!suggestionsAnnouncement, value ?? '');

    const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mergedRef = mergeRefs<BaseTextInputRef>(ref, optionsRef);

    const handleTextInputChange = useCallback(
        (text: string) => {
            onChangeText?.(text);
        },
        [onChangeText],
    );

    useFocusEffect(
        useCallback(() => {
            if (!shouldShowTextInput || disableAutoFocus || isScreenReaderEnabled || isInLandscapeMode) {
                return;
            }

            focusTimeoutRef.current = setTimeout(focusTextInput, CONST.ANIMATED_TRANSITION);

            return () => {
                if (!focusTimeoutRef.current) {
                    return;
                }
                clearTimeout(focusTimeoutRef.current);
                focusTimeoutRef.current = null;
            };
        }, [shouldShowTextInput, disableAutoFocus, focusTextInput, isInLandscapeMode, isScreenReaderEnabled]),
    );

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onFocusChange(true);
    }, [onFocusChange]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        onFocusChange(false);
    }, [onFocusChange]);

    if (!shouldShowTextInput) {
        return null;
    }

    return (
        <>
            <View style={[styles.ph5, styles.pb3, style?.containerStyle]}>
                <BaseTextInput
                    ref={mergedRef}
                    onKeyPress={onKeyPress}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    label={shouldUseCompactStyle ? undefined : label}
                    accessibilityLabel={accessibilityLabel ?? label}
                    hint={hint}
                    role={CONST.ROLE.PRESENTATION}
                    value={value}
                    placeholder={shouldUseCompactStyle ? (placeholder ?? label) : placeholder}
                    maxLength={maxLength}
                    onChangeText={handleTextInputChange}
                    inputMode={inputMode}
                    selectTextOnFocus
                    spellCheck={false}
                    onSubmitEditing={onSubmit}
                    submitBehavior={dataLength ? 'blurAndSubmit' : 'submit'}
                    isLoading={isLoading}
                    testID="selection-list-text-input"
                    errorText={errorText}
                    autoCorrect={!disableAutoCorrect}
                    shouldInterceptSwipe={shouldInterceptSwipe ?? false}
                    hideFocusedState={shouldUseCompactStyle}
                    placeholderTextColor={shouldUseCompactStyle ? compactSearchInputStyles.placeholderTextColor : undefined}
                    inputStyle={shouldUseCompactStyle ? compactSearchInputStyles.inputStyle : undefined}
                    textInputContainerStyles={shouldUseCompactStyle ? compactSearchInputStyles.textInputContainerStyles : undefined}
                    touchableInputWrapperStyle={shouldUseCompactStyle ? compactSearchInputStyles.touchableInputWrapperStyle : undefined}
                />
            </View>
            {shouldShowHeaderMessage && (
                <View style={[styles.ph5, styles.pb5, style?.headerMessageStyle]}>
                    <Text
                        style={[styles.textLabel, styles.colorMuted, styles.minHeight5]}
                        aria-hidden
                    >
                        {headerMessage}
                    </Text>
                </View>
            )}
        </>
    );
}

export default TextInput;

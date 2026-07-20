import {useTableContext} from '@components/Table/TableContext';
import TextInput from '@components/TextInput';
import isTextInputFocused from '@components/TextInput/BaseTextInput/isTextInputFocused';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useCompactSearchInputStyles from '@hooks/useCompactSearchInputStyles';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';

/**
 * Renders a search input that filters table data.
 */
type TableSearchBarProps = {
    /** Label and accessibility label for the search input. */
    label: string;
};

function TableSearchBar({label}: TableSearchBarProps) {
    const styles = useThemeStyles();
    const inputRef = useRef<BaseTextInputRef>(null);
    const [inputFocused, setInputFocused] = useState(false);

    const {
        activeSearchString,
        shouldUseNarrowTableLayout,
        onSearchStringChange,
        tableMethods: {updateSearchString},
    } = useTableContext();

    const hasActiveSearchString = activeSearchString.length > 0;

    useLayoutEffect(() => {
        if (!hasActiveSearchString || isTextInputFocused(inputRef)) {
            return;
        }

        inputRef.current?.focus?.();
    }, [hasActiveSearchString]);

    useEffect(() => {
        return () => updateSearchString('');
        // We only want the cleanup to run on unmount to reset the search state
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearchStringChange = (text: string) => {
        updateSearchString(text);
        onSearchStringChange?.(text);
    };

    const containerStyles = shouldUseNarrowTableLayout && styles.flex1;

    const compactSearchInputStyles = useCompactSearchInputStyles(shouldUseNarrowTableLayout, inputFocused);

    return (
        <TextInput
            ref={inputRef}
            hideFocusedState
            multiline={false}
            spellCheck={false}
            autoCorrect={false}
            placeholder={label}
            value={activeSearchString}
            role={CONST.ROLE.SEARCHBOX}
            inputMode={CONST.INPUT_MODE.TEXT}
            placeholderTextColor={compactSearchInputStyles.placeholderTextColor}
            inputStyle={compactSearchInputStyles.inputStyle}
            containerStyles={containerStyles}
            textInputContainerStyles={compactSearchInputStyles.textInputContainerStyles}
            touchableInputWrapperStyle={[styles.mnw200, compactSearchInputStyles.touchableInputWrapperStyle]}
            accessibilityLabel={label}
            shouldHideClearButton={false}
            clearButtonStyle={compactSearchInputStyles.clearButtonStyle}
            clearButtonIconSize={compactSearchInputStyles.clearButtonIconSize}
            onBlur={() => setInputFocused(false)}
            onFocus={() => setInputFocused(true)}
            onChangeText={handleSearchStringChange}
        />
    );
}

export default TableSearchBar;

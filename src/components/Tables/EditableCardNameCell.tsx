import TextInput from '@components/TextInput';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';
import TextWithTooltip from '@components/TextWithTooltip';
import {EditableCell, useInlineEditState} from '@components/TransactionItemRow/EditableCell';
import type {EditableProps} from '@components/TransactionItemRow/EditableCell';

import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useThemeStyles from '@hooks/useThemeStyles';

import StringUtils from '@libs/StringUtils';
import {isValidInputLength} from '@libs/ValidationUtils';

import CONST from '@src/CONST';

import type {StyleProp, TextStyle} from 'react-native';

import React, {useRef} from 'react';

type EditableCardNameCellProps = {
    /** The card name shown in the cell */
    name: string;

    /** Accessibility label of the input shown while editing */
    accessibilityLabel: string;

    /** Style of the card name when not editing */
    textStyle?: StyleProp<TextStyle>;
} & EditableProps<string>;

/** Same rules as the card name pages: a name is required and must fit the standard length limit. */
function isValidCardName(name: string) {
    return !!name && isValidInputLength(name, CONST.STANDARD_LENGTH_LIMIT).isValid;
}

/**
 * A card name cell for the workspace card tables that can be edited inline on wide layouts.
 * Saves on blur or Enter, cancels on Escape, and drops a name the card name pages would reject.
 */
function EditableCardNameCell({name, accessibilityLabel, textStyle, canEdit, onSave}: EditableCardNameCellProps) {
    const styles = useThemeStyles();
    const inputRef = useRef<BaseTextInputRef | null>(null);

    const {isEditing, localValue, setLocalValue, startEditing, save, cancelEditing} = useInlineEditState(
        canEdit,
        name,
        onSave
            ? (value) => {
                  const trimmedValue = value.trim();
                  if (!isValidCardName(trimmedValue)) {
                      return;
                  }
                  onSave(trimmedValue);
              }
            : undefined,
        (value, originalValue) => value.trim() === originalValue.trim(),
    );

    const handleEscape = () => {
        cancelEditing();
        inputRef.current?.blur();
    };

    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.ESCAPE, handleEscape, {captureOnInputs: true, isActive: isEditing});

    return (
        <EditableCell
            canEdit={canEdit}
            isEditing={isEditing}
            onStartEditing={startEditing}
            editContent={
                <TextInput
                    ref={inputRef}
                    accessibilityLabel={accessibilityLabel}
                    value={localValue}
                    onChangeText={(value) => setLocalValue(StringUtils.lineBreaksToSpaces(value))}
                    onBlur={save}
                    onSubmitEditing={save}
                    autoFocus
                    submitBehavior="blurAndSubmit"
                    // EditableCell is responsible for the cell's hover and focus styles (border, background).
                    // Suppress TextInput's own border and background to avoid visual conflicts.
                    textInputContainerStyles={styles.editableCellInputStyle}
                    touchableInputWrapperStyle={styles.editableCellInputStyle}
                    hideFocusedState
                    shouldApplyPaddingToContainer={false}
                />
            }
        >
            <TextWithTooltip
                shouldShowTooltip
                numberOfLines={1}
                text={name}
                style={textStyle}
            />
        </EditableCell>
    );
}

export default EditableCardNameCell;

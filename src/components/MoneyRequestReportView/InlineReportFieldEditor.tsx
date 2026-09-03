import DatePicker from '@components/DatePicker';
import TextInput from '@components/TextInput';
import ValuePicker from '@components/ValuePicker';

import CONST from '@src/CONST';
import type {PolicyReportField} from '@src/types/onyx';

import {Str} from 'expensify-common';
import React, {useState} from 'react';

type InlineReportFieldEditorProps = {
    /** The policy report field to render */
    field: PolicyReportField;

    /** Current resolved value of the field */
    fieldValue: string;

    /** Whether the field is disabled for the current user */
    isDisabled: boolean;

    /** Violation message to show under the input */
    errorText?: string;

    /** Called with the new value when the user commits an edit */
    onValueSaved: (newValue: string) => void;
};

const FULL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function InlineReportFieldEditor({field, fieldValue, isDisabled, errorText, onValueSaved}: InlineReportFieldEditorProps) {
    const [draftValue, setDraftValue] = useState(fieldValue);

    // Re-sync the draft when the stored value changes underneath us (optimistic update, another device)
    const [lastFieldValue, setLastFieldValue] = useState(fieldValue);
    if (fieldValue !== lastFieldValue) {
        setLastFieldValue(fieldValue);
        setDraftValue(fieldValue);
    }

    const label = Str.UCFirst(field.name);

    const commitDraft = () => {
        if (draftValue.trim() === (fieldValue ?? '').trim()) {
            return;
        }
        onValueSaved(draftValue);
    };

    if (field.type === CONST.REPORT_FIELD_TYPES.LIST && !isDisabled) {
        const enabledOptions = field.values.filter((_value, index) => !field.disabledOptions.at(index));
        return (
            <ValuePicker
                ref={null}
                label={label}
                value={fieldValue}
                items={enabledOptions.map((option) => ({value: option, label: option}))}
                errorText={errorText}
                onInputChange={(newValue) => {
                    if (typeof newValue !== 'string' || newValue === fieldValue) {
                        return;
                    }
                    onValueSaved(newValue);
                }}
            />
        );
    }

    if (field.type === CONST.REPORT_FIELD_TYPES.DATE && !isDisabled) {
        return (
            <DatePicker
                inputID={field.fieldID}
                label={label}
                accessibilityLabel={label}
                value={draftValue}
                minDate={CONST.CALENDAR_PICKER.MIN_DATE}
                maxDate={CONST.CALENDAR_PICKER.MAX_DATE}
                errorText={errorText}
                onInputChange={(newValue: string) => {
                    setDraftValue(newValue);
                    // Save only complete dates so partial keyboard input isn't persisted
                    if (!FULL_DATE_PATTERN.test(newValue) || newValue === fieldValue) {
                        return;
                    }
                    onValueSaved(newValue);
                }}
            />
        );
    }

    // Text and formula fields, plus any field type disabled for the current user
    return (
        <TextInput
            label={label}
            accessibilityLabel={label}
            value={draftValue}
            onChangeText={setDraftValue}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            errorText={errorText}
            disabled={isDisabled || field.type === CONST.REPORT_FIELD_TYPES.FORMULA}
        />
    );
}

export default InlineReportFieldEditor;

import {useConfirmationFields} from '@components/MoneyRequestConfirmationFields/context';
import ReportField from '@components/MoneyRequestConfirmationList/sections/ReportField';
import ToggleFields from '@components/MoneyRequestConfirmationList/sections/ToggleFields';
import type {ToggleHandlers} from '@components/MoneyRequestConfirmationListFooter/fieldGroupTypes';

import type {Participant} from '@src/types/onyx/IOU';

import React from 'react';

import type {FieldVisibility} from './fieldVisibility';

type SettingsFieldsProps = {
    /** Selected participants (drives ReportField presentation) */
    selectedParticipants: Participant[];

    /** Whether the billable toggle should be displayed */
    shouldShowBillable: boolean;

    /** Whether the reimbursable toggle should be displayed */
    shouldShowReimbursable: boolean;

    /** Toggle callbacks for billable/reimbursable */
    toggleHandlers: ToggleHandlers;

    /** When true, suppresses all fields in this group (all are below show-more) */
    isCompactMode: boolean;

    /** Per-field visibility decisions resolved by `computeFieldVisibility` */
    fieldVisibility: Pick<FieldVisibility, 'toggles' | 'report'>;
};

/**
 * Renders Toggles + ReportField — both below show-more, so the group returns null while compact.
 * Gating ReportField behind `isPolicyExpenseChat` keeps its 5 Onyx subscriptions
 * (including `COLLECTION.REPORT_NVP`) from instantiating on non-policy-expense flows.
 */
function SettingsFields({selectedParticipants, shouldShowBillable, shouldShowReimbursable, toggleHandlers, isCompactMode, fieldVisibility}: SettingsFieldsProps) {
    const {action, iouType, transactionID, reportID, reportActionID, isReadOnly, isPolicyExpenseChat, isPerDiemRequest, isNewManualExpenseFlowEnabled} = useConfirmationFields();

    if (isCompactMode) {
        return null;
    }

    const toggleFields = fieldVisibility.toggles && (
        <ToggleFields
            isReadOnly={isReadOnly}
            shouldShowReimbursable={shouldShowReimbursable}
            shouldShowBillable={shouldShowBillable}
            onToggleReimbursable={toggleHandlers.onToggleReimbursable}
            onToggleBillable={toggleHandlers.onToggleBillable}
            transactionID={transactionID}
        />
    );

    const reportField = fieldVisibility.report && (
        <ReportField
            selectedParticipants={selectedParticipants}
            isPolicyExpenseChat={isPolicyExpenseChat}
            iouType={iouType}
            reportID={reportID}
            reportActionID={reportActionID}
            action={action}
            transactionID={transactionID}
            isPerDiemRequest={isPerDiemRequest}
        />
    );

    // In the new manual expense flow the toggle rows group at the bottom of the form, below the report row.
    if (isNewManualExpenseFlowEnabled) {
        return (
            <>
                {reportField}
                {toggleFields}
            </>
        );
    }

    return (
        <>
            {toggleFields}
            {reportField}
        </>
    );
}

export default SettingsFields;

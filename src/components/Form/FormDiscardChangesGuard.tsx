/**
 * Connects a form to the "Discard changes?" modal. It is a separate component so that `useDiscardChangesConfirmation`,
 * which needs a navigation route, only runs for forms that opt in through `shouldConfirmDiscardChanges`.
 */
import useDiscardChangesConfirmation from '@hooks/useDiscardChangesConfirmation';

type FormDiscardChangesGuardProps = {
    /** Returns whether the form has input that leaving it would lose */
    getHasUnsavedChanges: () => boolean;

    /** Called when the user confirms discarding their changes */
    onDiscard: () => void;
};

function FormDiscardChangesGuard({getHasUnsavedChanges, onDiscard}: FormDiscardChangesGuardProps) {
    useDiscardChangesConfirmation({getHasUnsavedChanges, onConfirm: onDiscard});

    return null;
}

export default FormDiscardChangesGuard;

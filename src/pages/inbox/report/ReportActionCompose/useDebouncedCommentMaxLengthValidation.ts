import lodashDebounce from 'lodash/debounce';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {getCommentLength} from '@libs/ReportUtils';
import CONST from '@src/CONST';

type UseDebouncedCommentValidationProps = {
    /** The report ID */
    reportID: string | undefined;

    /** Whether the composer is in edit mode */
    isEditing?: boolean;
};

function useDebouncedCommentMaxLengthValidation({reportID, isEditing = false}: UseDebouncedCommentValidationProps) {
    const [exceededMaxLength, setExceededMaxLength] = useState<number | null>(null);
    const [isTaskTitle, setIsTaskTitle] = useState(false);

    /**
     * Updates the composer when the comment length is exceeded
     * Shows red borders and prevents the comment from being sent
     * When editing, we only validate comment length; task title rules do not apply.
     */
    const validateMaxLength = useCallback(
        (value: string) => {
            const taskCommentMatch = value?.match(CONST.REGEX.TASK_TITLE_WITH_OPTIONAL_SHORT_MENTION);

            // Only apply task-title validation when composing (not when editing an existing message)
            if (!isEditing && taskCommentMatch) {
                const title = taskCommentMatch?.[3] ? taskCommentMatch[3].trim().replaceAll('\n', ' ') : '';
                const exceeded = title ? title.length > CONST.TITLE_CHARACTER_LIMIT : false;

                setIsTaskTitle(exceeded);
                setExceededMaxLength(exceeded ? CONST.TITLE_CHARACTER_LIMIT : null);

                return !exceeded;
            }

            const exceeded = getCommentLength(value, {reportID}) > CONST.MAX_COMMENT_LENGTH;

            setIsTaskTitle(false);
            setExceededMaxLength(exceeded ? CONST.MAX_COMMENT_LENGTH : null);

            return !exceeded;
        },
        [reportID, isEditing],
    );

    // Memoize the debounced validator so the same instance is preserved across renders.
    // Recreating it on every render would reset lodash's internal `result`/`timerId`, which
    // makes `flush()` return `undefined` in `submitDraftAndClearComposer` and silently blocks
    // sending a restored draft after navigating away and back.
    const debouncedCommentMaxLengthValidation = useMemo(
        () => lodashDebounce(validateMaxLength, CONST.TIMING.COMMENT_LENGTH_DEBOUNCE_TIME, {leading: true}),
        [validateMaxLength],
    );

    // Cancel any pending trailing invocation when the instance is replaced (deps change) or the
    // component unmounts, so a stale validation cannot fire against an outdated closure.
    useEffect(() => () => debouncedCommentMaxLengthValidation.cancel(), [debouncedCommentMaxLengthValidation]);

    return {debouncedCommentMaxLengthValidation, exceededMaxLength, isTaskTitle, isExceedingMaxLength: !!exceededMaxLength};
}

export default useDebouncedCommentMaxLengthValidation;

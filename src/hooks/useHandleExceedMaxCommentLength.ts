import debounce from 'lodash/debounce';
import {useCallback, useMemo, useState} from 'react';
import * as ReportUtils from '@libs/ReportUtils';
import type {ParsingDetails} from '@libs/ReportUtils';
import CONST from '@src/CONST';

const useHandleExceedMaxCommentLength = () => {
    const [hasExceededMaxCommentLength, setHasExceededMaxCommentLength] = useState(false);
    const [isEqualToMaxCommentLength, setIsEqualToMaxCommentLength] = useState(false);
    const [commentLength, setCommentLength] = useState(0);

    const handleValueChange = useCallback(
        (value: string, parsingDetails?: ParsingDetails) => {
            const length = ReportUtils.getCommentLength(value, parsingDetails);
            const isMaxLength = length === CONST.MAX_COMMENT_LENGTH;
            const hasExceeded = length > CONST.MAX_COMMENT_LENGTH;
    
            setCommentLength(length);

            if (isMaxLength !== isEqualToMaxCommentLength) {
                setIsEqualToMaxCommentLength(isMaxLength);
            }
    
            if (hasExceeded !== hasExceededMaxCommentLength) {
                setHasExceededMaxCommentLength(hasExceeded);
            }
        },
        [hasExceededMaxCommentLength, isEqualToMaxCommentLength],
    );
    const validateCommentMaxLength = useMemo(() => debounce(handleValueChange, 1500, {leading: true}), [handleValueChange]);

    return {hasExceededMaxCommentLength, validateCommentMaxLength, isEqualToMaxCommentLength, commentLength};
};

export default useHandleExceedMaxCommentLength;

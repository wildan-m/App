import {useCallback, useState} from 'react';
import CONST from '@src/CONST';

const useHandleExceedMaxTaskTitleLength = () => {
    const [hasExceededMaxTaskTitleLength, setHasExceededMaxTitleLength] = useState(false);
    const [isEqualToMaxTaskTitleLength, setIsEqualToMaxTaskTitleLength] = useState(false);
    const [taskTitleLength, setTaskTitleLength] = useState(0);


    const validateTaskTitleMaxLength = useCallback((title: string) => {
        const exceeded = title ? title.length > CONST.TITLE_CHARACTER_LIMIT : false;
        setHasExceededMaxTitleLength(exceeded);


        const length = title ? title.length : 0;
        const isMaxLength = length === CONST.TITLE_CHARACTER_LIMIT;
        const hasExceeded = length > CONST.TITLE_CHARACTER_LIMIT;

        setTaskTitleLength(length);

        if (isMaxLength !== isEqualToMaxTaskTitleLength) {
            setIsEqualToMaxTaskTitleLength(isMaxLength);
        }

        if (hasExceeded !== hasExceededMaxTaskTitleLength) {
            setHasExceededMaxTitleLength(hasExceeded);
        }
    }, []);

    return {hasExceededMaxTaskTitleLength, validateTaskTitleMaxLength, setHasExceededMaxTitleLength, isEqualToMaxTaskTitleLength, taskTitleLength};
};

export default useHandleExceedMaxTaskTitleLength;

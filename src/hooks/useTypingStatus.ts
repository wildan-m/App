import lodashDebounce from 'lodash/debounce';
import lodashThrottle from 'lodash/throttle';
import {useCallback, useRef} from 'react';

type UseTypingStatusProps = {
    delay?: number;
};

type UseTypingStatusReturn = {
    isTypingRef: React.MutableRefObject<boolean>;
    handleUserTyping: () => void;
};

/**
 * Custom hook to track typing status of a user
 * @param delay - Delay in milliseconds before considering user stopped typing
 * @returns isTypingRef - A mutable ref object indicating if user is typing
 * @returns handleUserTyping - Function to handle user typing event
 */
const useTypingStatus = ({delay = 1000}: UseTypingStatusProps = {}): UseTypingStatusReturn => {
    const isTypingRef = useRef(false);

    const setTypingFalse = useCallback(() => {
        const debouncedFunc = lodashDebounce(() => {
            isTypingRef.current = false;
            /* The +500 difference in the setTypingFalse debounce function is added
            to ensure that the typing status is not set to false immediately right after 
            the user starts typing delay ended. It allows a small buffer period after the delay 
            before considering the user as not typing anymore. */
        }, delay + 500);
        debouncedFunc();
    }, [delay]);

    const handleUserTyping = useCallback(() => {
        const throttledFunc = lodashThrottle(() => {
            if (!isTypingRef.current) {
                isTypingRef.current = true;
            }
            setTypingFalse();
        }, delay);
        throttledFunc();
    }, [delay, setTypingFalse]);

    return {isTypingRef, handleUserTyping};
};

export default useTypingStatus;

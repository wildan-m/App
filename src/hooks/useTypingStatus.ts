import { useRef, useCallback } from 'react';
import lodashDebounce from 'lodash/debounce';
import lodashThrottle from 'lodash/throttle';

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
export const useTypingStatus = ({
    delay = 1000,
}: UseTypingStatusProps = {}): UseTypingStatusReturn => {
    const isTypingRef = useRef(false);

    const setTypingFalse = useCallback(
        lodashDebounce(() => {
            isTypingRef.current = false;
            /* The +500 difference in the setTypingFalse debounce function is added
            to ensure that the typing status is not set to false immediately after 
            the user starts typing. It allows a small buffer period after the delay 
            before considering the user as not typing anymore. */
        }, delay + 500),
        [delay]
    );

    const handleUserTyping = useCallback(
        lodashThrottle(() => {
            if (!isTypingRef.current) {
                isTypingRef.current = true;
            }
            setTypingFalse();
        }, delay),
        [delay]
    );

    return { isTypingRef, handleUserTyping };
};
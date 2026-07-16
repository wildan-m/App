import variables from '@styles/variables';

import type {LayoutChangeEvent} from 'react-native';

import {useCallback, useState} from 'react';

/**
 * Lets an `autoGrowHeight` text input grow into the space its container actually has, instead of
 * stopping at the fixed `variables.textInputAutoGrowMaxHeight` cap.
 *
 * Put `onLayout` on the flexing wrapper around the input and pass `maxAutoGrowHeight` to the input.
 * Until the first layout pass reports a height, the fixed cap is used as the fallback.
 */
function useMaxAutoGrowHeight() {
    const [availableHeight, setAvailableHeight] = useState<number>();

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        setAvailableHeight(event.nativeEvent.layout.height);
    }, []);

    return {
        maxAutoGrowHeight: availableHeight ?? variables.textInputAutoGrowMaxHeight,
        onLayout,
    };
}

export default useMaxAutoGrowHeight;

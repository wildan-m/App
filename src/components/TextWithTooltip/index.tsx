import Text from '@components/Text';
import Tooltip from '@components/Tooltip';

// eslint-disable-next-line no-restricted-imports
import type {Text as RNText} from 'react-native';

import React, {useRef, useState} from 'react';

import type TextWithTooltipProps from './types';

type HTMLElementWithText = HTMLElement & RNText;

function TextWithTooltip({testID, text, shouldShowTooltip, style, numberOfLines = 1, forwardedFSClass}: TextWithTooltipProps) {
    const textRef = useRef<HTMLElementWithText>(null);
    // Re-render whenever the text element is (re)laid out so the truncation check below re-reads the live DOM measurements.
    const [, setLayoutVersion] = useState(0);

    // Measure truncation from the live element on every render instead of caching a one-shot onLayout result,
    // which can be measured before the surrounding layout has settled and then never recomputed.
    const node = textRef.current;
    const isTruncated = !!node && (node.scrollWidth > node.offsetWidth || node.scrollHeight > node.offsetHeight);

    return (
        <Tooltip
            shouldRender={!!shouldShowTooltip && isTruncated}
            text={text}
        >
            <Text
                ref={textRef}
                testID={testID}
                style={style}
                numberOfLines={numberOfLines}
                onLayout={() => setLayoutVersion((version) => version + 1)}
                fsClass={forwardedFSClass}
            >
                {text}
            </Text>
        </Tooltip>
    );
}

export default TextWithTooltip;

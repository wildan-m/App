import Image from '@components/Image';
import RESIZE_MODES from '@components/Image/resizeModes';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React, {useState} from 'react';
import {View} from 'react-native';

import type ReceiptImageOverlayProps from './types';

const oversamplePercent = `${CONST.RECEIPT.HOVER_ZOOM_SCALE * 100}%`;
const oversampleContainerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: oversamplePercent,
    height: oversamplePercent,
    transform: `scale(${1 / CONST.RECEIPT.HOVER_ZOOM_SCALE})`,
    transformOrigin: 'top left',
};

/**
 * Renders the original receipt upload on top of the server's low-resolution thumbnail so hover zoom magnifies real
 * pixels instead of interpolating the derivative. The geometry mirrors the thumbnail underneath (same object position,
 * same cover fit, same aspect-ratio handling), so the two register pixel-for-pixel and swapping in the original is
 * invisible. Like the thumbnail, the image is laid out in an oversized container and scaled back down, so it is
 * rasterized with enough detail to stay sharp once the zoom transform is applied.
 */
function ReceiptImageOverlay({sourceURL, isAuthTokenRequired = true, shouldUseFullHeight, shouldCenterImage = true}: ReceiptImageOverlayProps) {
    const styles = useThemeStyles();

    // Track which URL failed so hasFailed resets automatically when sourceURL changes (e.g. after an auth token refresh),
    // mirroring the pattern in ReceiptPDFOverlay. No useEffect needed — the comparison runs synchronously during render.
    const [failedURL, setFailedURL] = useState<string | null>(null);
    const hasFailed = failedURL !== null && failedURL === sourceURL;

    // If the original can't be loaded, fall back to the thumbnail underneath by rendering nothing.
    if (hasFailed) {
        return null;
    }

    return (
        <View
            style={[styles.w100, styles.h100, styles.overflowHidden]}
            pointerEvents="none"
        >
            {/* <div> is required here because `transformOrigin` is a CSS-only property unsupported by React Native's
                View. The oversample-then-scale technique relies on it to anchor the downscale to the top-left corner. */}
            <div style={oversampleContainerStyle}>
                <View style={[styles.w100, styles.h100, shouldCenterImage && styles.alignItemsCenter, shouldCenterImage && styles.justifyContentCenter]}>
                    {/* eslint-disable-next-line react-native-a11y/has-valid-accessibility-ignores-invert-colors -- Custom Image wrapper does not support this prop. */}
                    <Image
                        source={{uri: sourceURL}}
                        style={[styles.w100, styles.h100]}
                        isAuthTokenRequired={isAuthTokenRequired}
                        resizeMode={RESIZE_MODES.cover}
                        // The image keeps itself hidden until it has loaded and measured, so the thumbnail below stays visible in the meantime.
                        objectPosition={CONST.IMAGE_OBJECT_POSITION.TOP}
                        shouldCalculateAspectRatioForWideImage={shouldUseFullHeight}
                        onError={() => setFailedURL(sourceURL)}
                    />
                </View>
            </div>
        </View>
    );
}

export default ReceiptImageOverlay;

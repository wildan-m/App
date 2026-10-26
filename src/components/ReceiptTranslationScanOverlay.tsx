import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

/**
 * A green scanning line that sweeps up and down over the receipt while a translation is in flight.
 */
function ReceiptTranslationScanOverlay() {
    const styles = useThemeStyles();
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.set(withRepeat(withTiming(1, {duration: CONST.ANIMATED_PROGRESS_BAR_DURATION, easing: Easing.inOut(Easing.ease)}), -1, true));
        return () => {
            cancelAnimation(progress);
        };
        // The sweep starts once on mount and loops until unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animatedLineStyle = useAnimatedStyle(() => ({
        top: `${progress.get() * 100}%`,
    }));

    return (
        <View
            style={[styles.pAbsolute, styles.t0, styles.b0, styles.l0, styles.r0, styles.overflowHidden]}
            pointerEvents="none"
        >
            <Animated.View style={[styles.pAbsolute, styles.l0, styles.r0, styles.receiptTranslationScanLine, animatedLineStyle]} />
        </View>
    );
}

export default ReceiptTranslationScanOverlay;

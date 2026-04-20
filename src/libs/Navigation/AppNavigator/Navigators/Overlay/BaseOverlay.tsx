import {useCardAnimation} from '@react-navigation/stack';
import React, {useCallback} from 'react';
// eslint-disable-next-line no-restricted-imports
import {Animated, View} from 'react-native';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import type {OverlayStylesParams} from '@styles/index';
import variables from '@styles/variables';
import CONST from '@src/CONST';

type BaseOverlayProps = {
    /* Callback to close the modal */
    onPress?: () => void;

    /* Override the progress from useCardAnimation. Necessary for the secondary overlay */
    progress?: OverlayStylesParams;

    /* Overlay position from the left edge of the container */
    positionLeftValue?: number | Animated.Value | Animated.AnimatedAddition<number>;

    /* Overlay position from the right edge of the container */
    positionRightValue?: number | Animated.Value | Animated.AnimatedAddition<number>;

    /* When true, the overlay stays visible but swallows clicks without invoking onPress.
       Used to block dismiss while an RHP stack transition is in flight (see issue #87174). */
    disabled?: boolean;
};

// The default value of positionLeftValue is equal to -2 * variables.sideBarWidth, because we need to stretch the overlay to cover the sidebar and the translate animation distance.
function BaseOverlay({onPress, progress, positionLeftValue = -2 * variables.sideBarWidth, positionRightValue = 0, disabled = false}: BaseOverlayProps) {
    const styles = useThemeStyles();
    const {current} = useCardAnimation();
    const {translate} = useLocalize();

    const guardedPress = useCallback(() => {
        if (disabled) {
            return;
        }
        onPress?.();
    }, [disabled, onPress]);

    return (
        <Animated.View
            id="BaseOverlay"
            aria-hidden
            style={[styles.pFixed, styles.t0, styles.b0, styles.overlayBackground, styles.overlayStyles({progress: progress ?? current.progress, positionLeftValue, positionRightValue})]}
        >
            <View style={[styles.flex1, styles.flexColumn]}>
                {/* In the latest Electron version buttons can't be both clickable and draggable.
             That's why we added this workaround. Because of two Pressable components on the desktop app
             we have 30px draggable ba at the top and the rest of the dimmed area is clickable. On other devices,
             everything behaves normally like one big pressable */}
                <PressableWithoutFeedback
                    style={[styles.draggableTopBar, styles.boxShadowNone, styles.cursorAuto]}
                    onPress={guardedPress}
                    accessibilityLabel={translate('common.close')}
                    role={CONST.ROLE.BUTTON}
                    id={CONST.OVERLAY.TOP_BUTTON_NATIVE_ID}
                    tabIndex={-1}
                    disabled={disabled}
                />
                <PressableWithoutFeedback
                    style={[styles.flex1, styles.boxShadowNone, styles.cursorAuto]}
                    onPress={guardedPress}
                    accessibilityLabel={translate('common.close')}
                    role={CONST.ROLE.BUTTON}
                    noDragArea
                    id={CONST.OVERLAY.BOTTOM_BUTTON_NATIVE_ID}
                    tabIndex={-1}
                    disabled={disabled}
                />
            </View>
        </Animated.View>
    );
}

export type {BaseOverlayProps};
export default BaseOverlay;

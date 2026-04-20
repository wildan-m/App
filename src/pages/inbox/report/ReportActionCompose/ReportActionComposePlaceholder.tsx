import React, {useMemo} from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import PulsingView from '@components/PulsingView';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';

/**
 * Lightweight visual replica of ReportActionCompose used as a placeholder
 * while deferring the real (heavy) composer during navigation transitions.
 * Renders the same container, icons, and placeholder text without any
 * functional hooks, Onyx connections, or event handlers.
 */
function ReportActionComposePlaceholder() {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Plus', 'Emoji', 'Send']);

    const wrapperStyle = useMemo(() => [styles.chatFooter, {minHeight: CONST.CHAT_FOOTER_MIN_HEIGHT}], [styles.chatFooter]);

    const plusButtonStyle = useMemo(
        () => [
            {flexBasis: (styles.composerSizeButton.width ?? 0) + (styles.composerSizeButton.marginHorizontal ?? 0) * 2},
            styles.flexGrow0,
            styles.flexShrink0,
            styles.justifyContentCenter,
            styles.alignItemsCenter,
        ],
        [styles.composerSizeButton.width, styles.composerSizeButton.marginHorizontal, styles.flexGrow0, styles.flexShrink0, styles.justifyContentCenter, styles.alignItemsCenter],
    );

    const textInputStyle = useMemo(
        () => [styles.textInputComposeSpacing, styles.textInputComposeBorder, {paddingVertical: 0}],
        [styles.textInputComposeSpacing, styles.textInputComposeBorder],
    );

    const placeholderTextStyle = useMemo(
        () => [
            styles.textNormal,
            {
                color: theme.placeholderText,
                lineHeight: styles.textInputCompose.lineHeight,
                paddingHorizontal: variables.avatarChatSpacing,
                alignSelf: 'center' as const,
            },
        ],
        [styles.textNormal, styles.textInputCompose.lineHeight, theme.placeholderText],
    );

    return (
        <PulsingView
            shouldPulse
            wrapperStyle={wrapperStyle}
        >
            <View
                style={[styles.chatItemComposeBoxColor, styles.flexRow, styles.chatItemComposeBox]}
                pointerEvents="none"
            >
                <View style={plusButtonStyle}>
                    <Icon
                        src={icons.Plus}
                        fill={theme.icon}
                    />
                </View>
                <View style={textInputStyle}>
                    <Text style={placeholderTextStyle}>{translate('reportActionCompose.writeSomething')}</Text>
                </View>
                <View style={[styles.chatItemEmojiButton, styles.justifyContentCenter]}>
                    <Icon
                        src={icons.Emoji}
                        fill={theme.icon}
                    />
                </View>
                <View style={[styles.chatItemSubmitButton]}>
                    <Icon
                        src={icons.Send}
                        fill={theme.icon}
                    />
                </View>
            </View>
            <View style={[styles.flexRow, styles.justifyContentBetween, styles.alignItemsCenter, styles.chatItemComposeSecondaryRow]} />
        </PulsingView>
    );
}

export default ReportActionComposePlaceholder;

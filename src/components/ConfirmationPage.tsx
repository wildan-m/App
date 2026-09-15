import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import Accessibility from '@libs/Accessibility';
import isIllustrationLottieAnimation from '@libs/isIllustrationLottieAnimation';

import CONST from '@src/CONST';
import type IconAsset from '@src/types/utils/IconAsset';

import type {StyleProp, TextStyle, ViewStyle} from 'react-native';

import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {ButtonProps} from './Button';
import type DotLottieAnimation from './LottieAnimations/types';

import Button from './Button';
import FixedFooter from './FixedFooter';
import ImageSVG from './ImageSVG';
import Lottie from './Lottie';
import LottieAnimations from './LottieAnimations';
import ScrollView from './ScrollView';
import Text from './Text';

type ConfirmationPageProps = {
    illustration?: DotLottieAnimation | IconAsset;
    heading: string;
    description?: React.ReactNode;
    descriptionComponent?: React.ReactNode;

    /** The text for the call to action */
    cta?: React.ReactNode;

    /** Call to action component of the confirmation page */
    ctaComponent?: React.ReactNode;

    /** Primary button rendered in the footer, composed by the caller (e.g. via `ConfirmationPage.Button`). Takes precedence over the deprecated flat primary button props */
    primaryButtonComponent?: React.ReactNode;

    /** Secondary button rendered in the footer above the primary button, composed by the caller (e.g. via `ConfirmationPage.Button`). Takes precedence over the deprecated flat secondary button props */
    secondaryButtonComponent?: React.ReactNode;

    /**
     * The text for the primary button label
     * @deprecated Compose the button via `primaryButtonComponent` instead
     */
    buttonText?: string;

    /**
     * A function that is called when the primary button is clicked on
     * @deprecated Compose the button via `primaryButtonComponent` instead
     */
    onButtonPress?: () => void;

    /**
     * Whether we should show a primary confirmation button
     * @deprecated Compose the button via `primaryButtonComponent` instead — a provided slot is always rendered
     */
    shouldShowButton?: boolean;

    /**
     * Whether the primary confirmation button should be disabled
     * @deprecated Compose the button via `primaryButtonComponent` instead
     */
    isButtonDisabled?: boolean;

    /**
     * Whether the primary confirmation button should show a loading spinner
     * @deprecated Compose the button via `primaryButtonComponent` instead
     */
    isButtonLoading?: boolean;

    /**
     * The text for the secondary button label
     * @deprecated Compose the button via `secondaryButtonComponent` instead
     */
    secondaryButtonText?: string;

    /** @deprecated Compose the button via `secondaryButtonComponent` instead */
    onSecondaryButtonPress?: () => void;

    /** @deprecated Compose the button via `secondaryButtonComponent` instead — a provided slot is always rendered */
    shouldShowSecondaryButton?: boolean;

    /**
     * Whether the secondary confirmation button should be disabled
     * @deprecated Compose the button via `secondaryButtonComponent` instead
     */
    isSecondaryButtonDisabled?: boolean;

    /**
     * Whether the secondary confirmation button should show a loading spinner
     * @deprecated Compose the button via `secondaryButtonComponent` instead
     */
    isSecondaryButtonLoading?: boolean;
    headingStyle?: TextStyle;

    /** Additional style for the animation */
    illustrationStyle?: StyleProp<ViewStyle>;

    descriptionStyle?: StyleProp<TextStyle>;
    ctaStyle?: TextStyle;
    footerStyle?: ViewStyle;

    /** Component rendered inside the footer, above the buttons (e.g. an inline error message) */
    footerComponent?: React.ReactNode;

    containerStyle?: ViewStyle;
    innerContainerStyle?: ViewStyle;
};

function ConfirmationPage({
    illustration = LottieAnimations.Fireworks,
    heading,
    description,
    descriptionComponent,
    cta,
    ctaComponent,
    primaryButtonComponent,
    secondaryButtonComponent,
    buttonText = '',
    onButtonPress = () => {},
    shouldShowButton = false,
    isButtonDisabled = false,
    isButtonLoading = false,
    secondaryButtonText = '',
    onSecondaryButtonPress = () => {},
    shouldShowSecondaryButton = false,
    isSecondaryButtonDisabled = false,
    isSecondaryButtonLoading = false,
    headingStyle,
    illustrationStyle,
    descriptionStyle,
    ctaStyle,
    footerStyle,
    footerComponent,
    containerStyle,
    innerContainerStyle,
}: ConfirmationPageProps) {
    const styles = useThemeStyles();
    const isReduceMotionEnabled = Accessibility.useReducedMotion();
    const illustrations = useMemoizedLazyIllustrations(['Fireworks']);
    const isLottie = isIllustrationLottieAnimation(illustration);
    const shouldShowStaticFallback = isLottie && isReduceMotionEnabled && illustration === LottieAnimations.Fireworks;

    return (
        <View style={[styles.flex1, containerStyle]}>
            <View style={styles.flex1}>
                <ScrollView contentContainerStyle={styles.flexGrow1}>
                    <View style={[styles.screenCenteredContainer, styles.alignItemsCenter, innerContainerStyle]}>
                        {(() => {
                            if (shouldShowStaticFallback) {
                                return (
                                    <View style={[styles.confirmationAnimation, illustrationStyle]}>
                                        <ImageSVG
                                            src={illustrations.Fireworks}
                                            contentFit="contain"
                                        />
                                    </View>
                                );
                            }
                            if (isLottie) {
                                return (
                                    <Lottie
                                        source={illustration}
                                        autoPlay
                                        loop
                                        style={[styles.confirmationAnimation, illustrationStyle]}
                                        webStyle={{
                                            width: (StyleSheet.flatten(illustrationStyle)?.width as number) ?? styles.confirmationAnimation.width,
                                            height: (StyleSheet.flatten(illustrationStyle)?.height as number) ?? styles.confirmationAnimation.height,
                                        }}
                                    />
                                );
                            }
                            return (
                                <View style={[styles.confirmationAnimation, illustrationStyle]}>
                                    <ImageSVG
                                        src={illustration}
                                        contentFit="contain"
                                    />
                                </View>
                            );
                        })()}
                        <Text style={[styles.textHeadline, styles.textAlignCenter, styles.mv2, headingStyle]}>{heading}</Text>
                        {!!descriptionComponent && descriptionComponent}
                        {!!description && <Text style={[styles.textAlignCenter, descriptionStyle, styles.w100]}>{description}</Text>}
                        {cta ? <Text style={[styles.textAlignCenter, ctaStyle]}>{cta}</Text> : null}
                        {!!ctaComponent && ctaComponent}
                    </View>
                </ScrollView>
                {!!footerComponent && <View style={[styles.pAbsolute, styles.b0, styles.l0, styles.r0, styles.ph5]}>{footerComponent}</View>}
            </View>
            {(!!secondaryButtonComponent || !!primaryButtonComponent || shouldShowSecondaryButton || shouldShowButton) && (
                <FixedFooter style={footerStyle}>
                    {secondaryButtonComponent ??
                        (shouldShowSecondaryButton && (
                            <Button
                                size={CONST.BUTTON_SIZE.LARGE}
                                testID="confirmation-secondary-button"
                                style={styles.mt3}
                                isDisabled={isSecondaryButtonDisabled}
                                isLoading={isSecondaryButtonLoading}
                                onPress={onSecondaryButtonPress}
                            >
                                <Button.Text>{secondaryButtonText}</Button.Text>
                            </Button>
                        ))}
                    {primaryButtonComponent ??
                        (shouldShowButton && (
                            <Button
                                variant={CONST.BUTTON_VARIANT.SUCCESS}
                                size={CONST.BUTTON_SIZE.LARGE}
                                testID="confirmation-primary-button"
                                style={styles.mt3}
                                isDisabled={isButtonDisabled}
                                isLoading={isButtonLoading}
                                onPress={onButtonPress}
                            >
                                <Button.KeyboardShortcut />
                                <Button.Text>{buttonText}</Button.Text>
                            </Button>
                        ))}
                </FixedFooter>
            )}
        </View>
    );
}

/**
 * Footer button for the ConfirmationPage slots. Pre-applies the footer sizing (large size, top margin) so composed
 * buttons stay visually consistent across confirmation screens, while the content stays composable by the caller
 * via the compound Button primitives (Button.Text, Button.Icon, Button.KeyboardShortcut).
 */
function ConfirmationPageButton({size = CONST.BUTTON_SIZE.LARGE, style, ...rest}: ButtonProps) {
    const styles = useThemeStyles();
    return (
        <Button
            size={size}
            style={[styles.mt3, style]}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...rest}
        />
    );
}

const ConfirmationPageCompound = Object.assign(ConfirmationPage, {
    Button: ConfirmationPageButton,
});

export default ConfirmationPageCompound;

export type {ConfirmationPageProps};

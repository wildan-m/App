import Button from '@components/Button';
import FixedFooter from '@components/FixedFooter';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ImageSVG from '@components/ImageSVG';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import colors from '@styles/theme/colors';
import variables from '@styles/variables';

import CONST from '@src/CONST';

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';

const ROTATION_EASING = Easing.out(Easing.cubic);
const TEXT_EASING = Easing.out(Easing.ease);

const CARD_ROTATION_DURATION = 1400;
const TEXT_FADE_DELAY = 400;
const TEXT_FADE_DURATION = 350;
const CARD_PERSPECTIVE = 1000;

// One and a half turns, so the card lands showing its back like the design reference.
const CARD_FINAL_ROTATION_DEG = 540;
const CARD_INITIAL_SCALE = 0.6;
const MAGSTRIPE_HEIGHT = 32;
const MAGSTRIPE_TOP_OFFSET = 24;

function CardActivatedPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const lazyIllustrations = useMemoizedLazyIllustrations(['ExpensifyCardImage']);

    const rotationProgress = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        rotationProgress.set(withTiming(1, {duration: CARD_ROTATION_DURATION, easing: ROTATION_EASING}));
        textOpacity.set(withDelay(CARD_ROTATION_DURATION + TEXT_FADE_DELAY, withTiming(1, {duration: TEXT_FADE_DURATION, easing: TEXT_EASING})));
    }, [rotationProgress, textOpacity]);

    const cardScaleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{scale: interpolate(rotationProgress.get(), [0, 1], [CARD_INITIAL_SCALE, 1])}],
    }));

    // Each face carries its own rotation because the web renderer flattens nested 3D transforms, so a rotation on the shared parent would not hide either face's backface.
    const frontFaceAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{perspective: CARD_PERSPECTIVE}, {rotateY: `${interpolate(rotationProgress.get(), [0, 1], [0, CARD_FINAL_ROTATION_DEG])}deg`}],
    }));

    const backFaceAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{perspective: CARD_PERSPECTIVE}, {rotateY: `${interpolate(rotationProgress.get(), [0, 1], [180, CARD_FINAL_ROTATION_DEG + 180])}deg`}],
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.get(),
    }));

    const dismiss = () => Navigation.dismissModal();

    return (
        <ScreenWrapper
            enableEdgeToEdgeBottomSafeAreaPadding
            testID="CardActivatedPage"
        >
            <HeaderWithBackButton onBackButtonPress={dismiss} />
            <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter, styles.ph5]}>
                <Animated.View style={[{width: variables.cardPreviewWidth, height: variables.cardPreviewHeight}, cardScaleAnimatedStyle]}>
                    <Animated.View style={[styles.pAbsolute, styles.h100, styles.w100, styles.walletCard, {backfaceVisibility: 'hidden'}, frontFaceAnimatedStyle]}>
                        <ImageSVG
                            contentFit="contain"
                            src={lazyIllustrations.ExpensifyCardImage}
                            pointerEvents="none"
                            height={variables.cardPreviewHeight}
                            width={variables.cardPreviewWidth}
                        />
                    </Animated.View>
                    {/* Placeholder back-of-card art until the design export lands */}
                    <Animated.View
                        style={[styles.pAbsolute, styles.h100, styles.w100, styles.walletCard, {backfaceVisibility: 'hidden', backgroundColor: colors.green800}, backFaceAnimatedStyle]}
                    >
                        <View style={[styles.w100, {height: MAGSTRIPE_HEIGHT, marginTop: MAGSTRIPE_TOP_OFFSET, backgroundColor: colors.green700}]} />
                    </Animated.View>
                </Animated.View>
                <Animated.View style={[styles.alignItemsCenter, styles.mt8, textAnimatedStyle]}>
                    <Text
                        style={[styles.textHeadline, styles.textAlignCenter]}
                        accessibilityRole={CONST.ROLE.HEADER}
                    >
                        {translate('cardActivatedPage.youreAllSet')}
                    </Text>
                    <Text style={[styles.textSupporting, styles.textAlignCenter, styles.mt2]}>{translate('cardActivatedPage.cardReadyToUse')}</Text>
                </Animated.View>
            </View>
            <FixedFooter>
                <Button
                    sentryLabel={CONST.SENTRY_LABEL.EXPENSIFY_CARD_PAGE.CARD_ACTIVATED_DISMISS}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    style={styles.w100}
                    onPress={dismiss}
                >
                    <Button.Text>{translate('common.buttonConfirm')}</Button.Text>
                </Button>
            </FixedFooter>
        </ScreenWrapper>
    );
}

export default CardActivatedPage;

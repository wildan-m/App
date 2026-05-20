import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {View} from 'react-native';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {dismissProductTraining} from '@libs/actions/Welcome';
import CONST from '@src/CONST';
import Button from './Button';
import Icon from './Icon';
import {PressableWithoutFeedback} from './Pressable';
import Text from './Text';
import Tooltip from './Tooltip';

type AgentPromotionBannerProps = {
    /** Banner title copy */
    title: string;

    /** Product-training element name used to persist the dismissal (e.g. agentsWorkflowsBanner) */
    productTrainingElementName: string;

    /** Optional CTA button label */
    ctaText?: string;

    /** Optional CTA press handler */
    onCTAPress?: () => void;

    /** Optional container style override */
    style?: StyleProp<ViewStyle>;
};

/**
 * A dismissible green banner used to promote the Agents feature from workspace admin pages.
 * Dismissal is persisted through the existing product-training NVP, so once closed it stays hidden
 * across sessions. The parent is responsible for gating rendering on the `customAgent` beta and on
 * whether `productTrainingElementName` has already been dismissed.
 */
function AgentPromotionBanner({title, productTrainingElementName, ctaText, onCTAPress, style}: AgentPromotionBannerProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['Close', 'Lightbulb']);

    return (
        <View style={[styles.flexRow, styles.alignItemsCenter, styles.p4, styles.borderRadiusNormal, styles.mt3, {backgroundColor: theme.success}, style]}>
            <Icon
                src={icons.Lightbulb}
                fill={theme.textLight}
                additionalStyles={[styles.mr3]}
            />
            <View style={[styles.flex1]}>
                <Text style={[styles.textStrong, {color: theme.textLight}]}>{title}</Text>
            </View>
            {!!ctaText && !!onCTAPress && (
                <Button
                    onPress={onCTAPress}
                    text={ctaText}
                    style={[styles.ml3]}
                />
            )}
            <Tooltip text={translate('common.close')}>
                <PressableWithoutFeedback
                    onPress={() => dismissProductTraining(productTrainingElementName, true)}
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={translate('common.close')}
                    sentryLabel="AgentPromotionBanner-Close"
                    style={[styles.ml3]}
                >
                    <Icon
                        src={icons.Close}
                        height={20}
                        width={20}
                        fill={theme.textLight}
                    />
                </PressableWithoutFeedback>
            </Tooltip>
        </View>
    );
}

AgentPromotionBanner.displayName = 'AgentPromotionBanner';

export default AgentPromotionBanner;

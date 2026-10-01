import Icon from '@components/Icon';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import type {InsightsCard} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';

type InsightsAICardProps = {
    /** The AI insight the card shows */
    card: InsightsCard;
};

function InsightsAICard({card}: InsightsAICardProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const icons = useMemoizedLazyExpensifyIcons(['Sparkles']);

    return (
        <View style={[styles.widgetContainer, styles.insightsAICard(shouldUseNarrowLayout)]}>
            <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap2]}>
                <Icon
                    src={icons.Sparkles}
                    fill={theme.iconSuccessFill}
                    width={variables.iconSizeSmall}
                    height={variables.iconSizeSmall}
                />
                <Text style={[styles.textStrong, styles.flexShrink1]}>{card.title}</Text>
            </View>
            <Text style={styles.textSupporting}>{card.description}</Text>
        </View>
    );
}

export default InsightsAICard;

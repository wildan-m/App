import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import type {InsightsCard} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';

import InsightsAICard from './InsightsAICard';

type InsightsAICardRowProps = {
    /** AI insight cards from the dashboard's Onyx record, in the order they are stored */
    cards: InsightsCard[] | undefined;
};

/** Shows the dashboard's AI insight cards side by side, or stacked on narrow layouts. Renders nothing when there are no cards. */
function InsightsAICardRow({cards}: InsightsAICardRowProps) {
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    if (!cards?.length) {
        return null;
    }

    return (
        <View
            style={styles.insightsAICardRow(shouldUseNarrowLayout)}
            testID="InsightsAICardRow"
        >
            {cards.map((card, index) => (
                <InsightsAICard
                    // eslint-disable-next-line react/no-array-index-key -- cards have no ID and keep the order they are stored in
                    key={index}
                    card={card}
                />
            ))}
        </View>
    );
}

export default InsightsAICardRow;

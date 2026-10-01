import Button from '@components/Button';
import useAskConcierge from '@components/Search/SearchRouter/useAskConcierge';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';

import CONST from '@src/CONST';
import type {InsightsScope} from '@src/types/onyx/SidePanel';

import type {StyleProp, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';

import React from 'react';

type InsightsExplainButtonProps = {
    /** Message sent to Concierge when the button is pressed */
    explainPrompt: string;

    /** Dashboard and filters the explained content was generated for, sent along so Concierge reads the same data */
    insightsScope: InsightsScope;

    /** Accented style for AI insight cards, muted style for chart headers */
    variant?: ValueOf<typeof CONST.INSIGHTS.EXPLAIN_BUTTON_VARIANT>;

    /** Additional styles applied to the button's pressable */
    style?: StyleProp<ViewStyle>;

    testID?: string;
};

/** Asks Concierge to explain an AI insight card or a chart, scoped to the dashboard's filters. Hidden until Concierge is ready to receive the question. */
function InsightsExplainButton({explainPrompt, insightsScope, variant = CONST.INSIGHTS.EXPLAIN_BUTTON_VARIANT.CARD, style, testID}: InsightsExplainButtonProps) {
    const StyleUtils = useStyleUtils();
    const theme = useTheme();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Sparkles']);
    const {askConcierge, shouldShowAskConcierge} = useAskConcierge({forceConcierge: true});

    if (!shouldShowAskConcierge) {
        return null;
    }

    const isCard = variant === CONST.INSIGHTS.EXPLAIN_BUTTON_VARIANT.CARD;
    const contentColor = isCard ? theme.link : theme.textSupporting;
    const hoverColor = isCard ? theme.linkHover : theme.text;

    return (
        <Button
            size={CONST.BUTTON_SIZE.SMALL}
            onPress={() => askConcierge(explainPrompt, {insightsScope})}
            accessibilityLabel={translate('reportActionContextMenu.explain')}
            sentryLabel={isCard ? CONST.SENTRY_LABEL.INSIGHTS.EXPLAIN_CARD : CONST.SENTRY_LABEL.INSIGHTS.EXPLAIN_CHART}
            style={style}
            testID={testID}
        >
            <Button.Icon
                src={icons.Sparkles}
                fill={contentColor}
                hoverFill={hoverColor}
            />
            <Button.Text
                style={StyleUtils.getColorStyle(contentColor)}
                hoverStyle={StyleUtils.getColorStyle(hoverColor)}
            >
                {translate('reportActionContextMenu.explain')}
            </Button.Text>
        </Button>
    );
}

export default InsightsExplainButton;

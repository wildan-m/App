import Button from '@components/Button';
import useAskConcierge from '@components/Search/SearchRouter/useAskConcierge';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';

import CONST from '@src/CONST';

import type {StyleProp, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';

import React from 'react';

type InsightsExplainButtonProps = {
    /** Message sent to Concierge when the button is pressed */
    explainPrompt: string;

    /** Muted style for chart headers, accented style for AI insight cards */
    variant?: ValueOf<typeof CONST.INSIGHTS.EXPLAIN_BUTTON_VARIANT>;

    /** Additional styles applied to the button's pressable */
    style?: StyleProp<ViewStyle>;

    testID?: string;
};

/** Asks Concierge to explain a chart or an AI insight card. Hidden until Concierge is ready to receive the question. */
function InsightsExplainButton({explainPrompt, variant = CONST.INSIGHTS.EXPLAIN_BUTTON_VARIANT.CHART, style, testID}: InsightsExplainButtonProps) {
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
            onPress={() => askConcierge(explainPrompt)}
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

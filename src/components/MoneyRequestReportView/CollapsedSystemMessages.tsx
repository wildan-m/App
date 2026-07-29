import Icon from '@components/Icon';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';

type CollapsedSystemMessagesProps = {
    /** Number of system messages in the collapsed run */
    count: number;

    /** Whether the run is currently expanded below this row */
    isExpanded: boolean;

    /** Toggles the run between collapsed and expanded */
    onToggle: () => void;
};

/**
 * Summary row shown in place of a back-to-back run of system messages in the expense report audit
 * trail ("4 changes"). Pressing it expands the run in place; pressing again collapses it.
 */
function CollapsedSystemMessages({count, isExpanded, onToggle}: CollapsedSystemMessagesProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate} = useLocalize();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['DownArrow']);
    const label = translate('systemMessage.collapsedChangesCount', {count});

    return (
        <PressableWithFeedback
            onPress={onToggle}
            accessibilityLabel={label}
            role={CONST.ROLE.BUTTON}
            style={[styles.chatItem, styles.alignItemsCenter, styles.gap1]}
        >
            <Text style={styles.mutedNormalTextLabel}>{label}</Text>
            <Icon
                src={expensifyIcons.DownArrow}
                fill={theme.icon}
                width={variables.iconSizeExtraSmall}
                height={variables.iconSizeExtraSmall}
                additionalStyles={isExpanded ? styles.flipUpsideDown : undefined}
            />
        </PressableWithFeedback>
    );
}

export default CollapsedSystemMessages;

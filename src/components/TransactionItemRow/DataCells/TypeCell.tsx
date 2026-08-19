import Icon from '@components/Icon';
import TextWithTooltip from '@components/TextWithTooltip';
import Tooltip from '@components/Tooltip';

import useExpenseTypeDetails from '@hooks/useExpenseTypeDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import type TransactionDataCellProps from './TransactionDataCellProps';

function TypeCell({transactionItem, shouldUseNarrowLayout, shouldShowTooltip}: TransactionDataCellProps) {
    const {translate} = useLocalize();
    const [card] = useOnyx(ONYXKEYS.CARD_LIST, {selector: (cardList) => (transactionItem.cardID ? cardList?.[transactionItem.cardID] : undefined)});
    const theme = useTheme();
    const {typeIcon, typeTranslationKey, typeLabelTranslationKey} = useExpenseTypeDetails(transactionItem, card);
    const styles = useThemeStyles();

    return shouldUseNarrowLayout ? (
        <TextWithTooltip
            shouldShowTooltip={shouldShowTooltip}
            text={translate(typeTranslationKey)}
            style={[styles.mutedNormalTextLabel, styles.pre, styles.justifyContentCenter, styles.flexShrink0]}
        />
    ) : (
        <Tooltip text={translate(typeLabelTranslationKey)}>
            <View>
                <Icon
                    src={typeIcon}
                    fill={theme.icon}
                    height={variables.iconSizeSmall}
                    width={variables.iconSizeSmall}
                />
            </View>
        </Tooltip>
    );
}

export default TypeCell;

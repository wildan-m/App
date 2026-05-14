import React from 'react';
import TextWithIconCell from '@components/Search/SearchList/ListItem/TextWithIconCell';
import TextWithTooltip from '@components/TextWithTooltip';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getDecodedCategoryName, isCategoryMissing} from '@libs/CategoryUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type TransactionDataCellProps from './TransactionDataCellProps';

function CategoryCell({shouldUseNarrowLayout, shouldShowTooltip, transactionItem}: TransactionDataCellProps) {
    const icons = useMemoizedLazyExpensifyIcons(['Folder']);
    const styles = useThemeStyles();
    const [policyCategories] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${transactionItem?.policy?.id}`);

    const categoryForDisplay = isCategoryMissing(transactionItem?.category, policyCategories) ? '' : getDecodedCategoryName(transactionItem?.category ?? '');

    return shouldUseNarrowLayout ? (
        <TextWithIconCell
            icon={icons.Folder}
            showTooltip={shouldShowTooltip}
            text={categoryForDisplay}
            textStyle={[styles.textMicro, styles.mnh0]}
        />
    ) : (
        <TextWithTooltip
            shouldShowTooltip={shouldShowTooltip}
            text={categoryForDisplay}
            numberOfLines={1}
            style={[styles.lineHeightLarge, styles.justifyContentCenter]}
        />
    );
}

export default CategoryCell;

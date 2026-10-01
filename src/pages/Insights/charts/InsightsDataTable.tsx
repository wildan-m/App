import UserAvatar from '@components/Avatar/UserAvatar';
import type {TransactionCardGroupListItemType, TransactionMemberGroupListItemType} from '@components/Search/SearchList/ListItem/types';
import type {GroupedItem, SearchChartDataRow, SearchGroupBy} from '@components/Search/types';
import Text from '@components/Text';

import {useCurrencyListActions} from '@hooks/useCurrencyList';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import InsightsDataTableSkeleton from './InsightsDataTableSkeleton';

/** Placeholder rows while loading */
const SKELETON_ROW_COUNT = 5;

type InsightsDataTableProps = {
    /** The plotted groups, prepared by `SearchChartView` */
    rows: SearchChartDataRow[];

    /** The dimension the rows are grouped by */
    groupBy: SearchGroupBy;

    isLoading?: boolean;
};

/** Narrows a group to the member-based variants, the ones carrying the person's avatar and account ID. */
function isMemberGroupBy(groupBy: SearchGroupBy) {
    return groupBy === CONST.SEARCH.GROUP_BY.FROM || groupBy === CONST.SEARCH.GROUP_BY.CARD;
}

function isMemberGroup(item: GroupedItem): item is TransactionMemberGroupListItemType | TransactionCardGroupListItemType {
    return isMemberGroupBy(item.groupedBy);
}

function InsightsDataTable({rows, groupBy, isLoading}: InsightsDataTableProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {convertToDisplayString} = useCurrencyListActions();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const shouldShowAvatar = isMemberGroupBy(groupBy);

    if (isLoading) {
        return (
            <InsightsDataTableSkeleton
                fixedNumItems={SKELETON_ROW_COUNT}
                shouldShowAvatar={shouldShowAvatar}
            />
        );
    }

    if (rows.length === 0) {
        return null;
    }

    return (
        <View style={styles.chartInlineTable}>
            {rows.map((row, index) => {
                const {item, point, color} = row;
                const isLastRow = index === rows.length - 1;

                return (
                    <View
                        key={item.keyForList}
                        style={[styles.flexRow, styles.alignItemsStart, styles.gap5, styles.pv4, shouldUseNarrowLayout ? styles.ph5 : styles.ph8, !isLastRow && styles.borderBottom]}
                    >
                        <View style={[styles.flex1, styles.flexRow, styles.alignItemsStart, styles.gap3]}>
                            {isMemberGroup(item) ? (
                                <View style={[styles.insightsRowAvatarRing, !!color && StyleUtils.getBorderColorStyle(color)]}>
                                    <UserAvatar
                                        size={CONST.AVATAR_SIZE.XXX_SMALL}
                                        source={item.avatar}
                                        accountID={item.accountID}
                                    />
                                </View>
                            ) : (
                                <View style={[styles.insightsRowDot, !!color && StyleUtils.getBackgroundColorStyle(color)]} />
                            )}
                            <Text style={styles.flex1}>{point.label}</Text>
                        </View>
                        <Text style={styles.textAlignRight}>{convertToDisplayString(item.total ?? 0, item.currency)}</Text>
                    </View>
                );
            })}
        </View>
    );
}

export default InsightsDataTable;

import type {SingleSelectItem} from '@components/Search/FilterComponents/SingleSelect';
import DropdownButton from '@components/Search/FilterDropdowns/DropdownButton';
import type {PopoverComponentProps} from '@components/Search/FilterDropdowns/FilterPopupButton';
import SingleSelectPopup from '@components/Search/FilterDropdowns/SingleSelectPopup';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {InsightsFilters} from '@pages/Insights/insightsFilters';
import DEFAULT_INSIGHTS_FILTERS, {INSIGHTS_GROUP_BY_OPTIONS} from '@pages/Insights/insightsFilters';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';

import INSIGHTS_CONTROL_ANCHOR_ALIGNMENT from './insightsControls';

/** Menu value of the running total, which plots by a bucket of its own rather than naming one */
const RUNNING_TOTAL_OPTION = 'runningTotal';

type InsightsGroupByOption = InsightsFilters['groupBy'] | typeof RUNNING_TOTAL_OPTION;

type InsightsGroupByDropdownProps = {
    /** Time bucket the headline chart aggregates into */
    groupBy: InsightsFilters['groupBy'];

    /** Whether the headline chart plots the running total, which the pill shows in place of the bucket */
    isRunningTotal?: boolean;

    onChange: (update: Partial<Pick<InsightsFilters, 'groupBy' | 'isRunningTotal'>>) => void;
};

function InsightsGroupByDropdown({groupBy, isRunningTotal, onChange}: InsightsGroupByDropdownProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const items: Array<SingleSelectItem<InsightsGroupByOption>> = [
        ...INSIGHTS_GROUP_BY_OPTIONS.map((option) => ({
            text: translate(`search.filters.groupBy.${option}`),
            value: option,
        })),
        {
            text: translate('insightsPage.runningTotal'),
            value: RUNNING_TOTAL_OPTION,
            shouldShowDividerAbove: true,
        },
    ];
    const selectedItem = items.find((item) => item.value === (isRunningTotal ? RUNNING_TOTAL_OPTION : groupBy));

    const onSelect = (value: InsightsGroupByOption) => {
        if (value === RUNNING_TOTAL_OPTION) {
            onChange({isRunningTotal: true});
            return;
        }
        onChange({groupBy: value, isRunningTotal: undefined});
    };

    const label = translate('search.display.groupBy');

    const groupByPopover = ({closeOverlay}: PopoverComponentProps) => (
        <SingleSelectPopup
            label={label}
            items={items}
            value={selectedItem}
            defaultValue={DEFAULT_INSIGHTS_FILTERS.groupBy}
            closeOverlay={closeOverlay}
            onChange={(item) => onSelect(item?.value ?? DEFAULT_INSIGHTS_FILTERS.groupBy)}
        />
    );

    return (
        <DropdownButton
            label={label}
            value={selectedItem?.text ?? null}
            sentryLabel={CONST.SENTRY_LABEL.INSIGHTS.CONTROL_GROUP_BY}
            wrapperStyle={[styles.getWidgetHeaderButtonOverflowStyle(variables.componentSizeSmall), styles.flexShrink1]}
            innerStyles={styles.bgTransparent}
            hoverStyles={styles.widgetHeaderMenuButtonHovered}
            labelStyle={styles.textSupporting}
            popoverAnchorAlignment={INSIGHTS_CONTROL_ANCHOR_ALIGNMENT}
            PopoverComponent={groupByPopover}
        />
    );
}

export default InsightsGroupByDropdown;

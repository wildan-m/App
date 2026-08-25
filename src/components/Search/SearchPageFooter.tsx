import Button from '@components/ButtonComposed';
import Text from '@components/Text';

import {useCurrencyListActions} from '@hooks/useCurrencyList';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {SearchFooterCountType, SearchFooterTotalType} from '@src/types/onyx/SearchFooterSelections';

import type {StyleProp, TextStyle} from 'react-native';

import React, {useMemo, useState} from 'react';
import {View} from 'react-native';

import type {SingleSelectItem} from './FilterComponents/SingleSelect';
import type {ButtonComponentProps, FilterPopupButtonProps} from './FilterDropdowns/FilterPopupButton';

import CurrencyPopup from './FilterDropdowns/CurrencyPopup';
import FilterPopupButton from './FilterDropdowns/FilterPopupButton';
import SingleSelectPopup from './FilterDropdowns/SingleSelectPopup';
import SearchPageFooterSkeleton from './SearchPageFooterSkeleton';

const noop = () => {};

const POPOVER_ANCHOR_ALIGNMENT = {
    horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT,
    vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.BOTTOM,
};

const TOTAL_TYPE_TRANSLATION_KEYS: Record<SearchFooterTotalType, TranslationPaths> = {
    [CONST.SEARCH.FOOTER_TOTAL_TYPES.TOTAL]: 'common.totalSpend',
    [CONST.SEARCH.FOOTER_TOTAL_TYPES.REIMBURSABLE]: 'common.reimbursable',
    [CONST.SEARCH.FOOTER_TOTAL_TYPES.NON_REIMBURSABLE]: 'common.nonReimbursable',
    [CONST.SEARCH.FOOTER_TOTAL_TYPES.BILLABLE]: 'common.billable',
    [CONST.SEARCH.FOOTER_TOTAL_TYPES.NON_BILLABLE]: 'common.nonBillable',
};

type SearchPageFooterProps = {
    /** Number of expenses represented by the footer total */
    count: number | undefined;

    /** Number of reports the results belong to; undefined when the search did not return one (no count selector then) */
    reportCount: number | undefined;

    /** Which count is displayed */
    countType: SearchFooterCountType;

    /** Count selected when the count selector is reset (follows the search type) */
    defaultCountType: SearchFooterCountType;

    /** Total amount to display in the footer */
    total: number | undefined;

    /** Which spend aggregate the total represents */
    totalType: SearchFooterTotalType;

    /** Spend aggregates the current results can be broken out by; a single entry hides the total selector */
    availableTotalTypes: SearchFooterTotalType[];

    /** Currency code for the displayed total */
    currency: string | undefined;

    /** Currency code used when the footer currency is reset */
    defaultCurrency: string | undefined;

    /** Whether the footer total is currently refreshing */
    isTotalLoading: boolean;

    /** Function to call when the displayed count changes; applies instantly with no request */
    onCountTypeChange: (countType: SearchFooterCountType) => void;

    /** Function to call when the displayed spend aggregate changes; re-runs the search for the new total */
    onTotalTypeChange: (totalType: SearchFooterTotalType) => void;

    /** Function to call when the footer currency changes */
    onCurrencyChange: (currency: string) => void;
};

function SearchPageFooter({
    count,
    reportCount,
    countType,
    defaultCountType,
    total,
    totalType,
    availableTotalTypes,
    currency,
    defaultCurrency,
    isTotalLoading,
    onCountTypeChange,
    onTotalTypeChange,
    onCurrencyChange,
}: SearchPageFooterProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const {convertToDisplayString} = useCurrencyListActions();
    const {isOffline} = useNetwork();
    const icons = useMemoizedLazyExpensifyIcons(['DownArrow']);

    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const [isSelectorButtonFocused, setIsSelectorButtonFocused] = useState(false);

    const valueTextStyle = useMemo(() => (isOffline ? [styles.textLabelSupporting, styles.labelStrong] : [styles.labelStrong]), [isOffline, styles]);

    // The SearchList registers a global Enter shortcut that opens the focused expense. While a footer selector is focused,
    // claim Enter at top priority without bubbling so Enter only opens that popover instead of also opening the expense.
    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.ENTER, noop, {isActive: isSelectorButtonFocused, shouldBubble: false, shouldPreventDefault: false});

    const countItems = useMemo<Array<SingleSelectItem<SearchFooterCountType>>>(
        () => [
            {text: translate('common.expenses'), value: CONST.SEARCH.FOOTER_COUNT_TYPES.EXPENSES},
            {text: translate('common.reports'), value: CONST.SEARCH.FOOTER_COUNT_TYPES.REPORTS},
        ],
        [translate],
    );
    const totalItems = useMemo<Array<SingleSelectItem<SearchFooterTotalType>>>(
        () => availableTotalTypes.map((type) => ({text: translate(TOTAL_TYPE_TRANSLATION_KEYS[type]), value: type})),
        [availableTotalTypes, translate],
    );

    const isReportCount = countType === CONST.SEARCH.FOOTER_COUNT_TYPES.REPORTS;
    const countLabel = translate(isReportCount ? 'common.reports' : 'common.expenses');
    const countValue = isReportCount ? reportCount : count;
    const totalLabel = translate(TOTAL_TYPE_TRANSLATION_KEYS[totalType] ?? 'common.totalSpend');

    // The count selector needs both counts; a search that returned no report count keeps the count as static text.
    const shouldShowCountSelector = reportCount !== undefined;
    // Total spend is always listed, so the selector only makes sense once a second option applies to the results.
    const shouldShowTotalSelector = availableTotalTypes.length > 1;
    // Changing the total or the currency needs a request, so both wait for the one in flight; the count never does.
    const areRequestSelectorsDisabled = isOffline || isTotalLoading;

    const handleCountChange = (item: SingleSelectItem<SearchFooterCountType> | undefined) => {
        onCountTypeChange(item?.value ?? defaultCountType);
    };

    const handleTotalTypeChange = (item: SingleSelectItem<SearchFooterTotalType> | undefined) => {
        if (areRequestSelectorsDisabled) {
            return;
        }
        onTotalTypeChange(item?.value ?? CONST.SEARCH.FOOTER_TOTAL_TYPES.TOTAL);
    };

    const handleCurrencyChange = (item: SingleSelectItem<string> | undefined) => {
        if (areRequestSelectorsDisabled) {
            return;
        }

        // Reset (no item) selects the default explicitly so figures loaded in another currency get converted to it.
        const nextCurrency = item?.value ?? defaultCurrency;
        if (!nextCurrency) {
            return;
        }
        onCurrencyChange(nextCurrency);
    };

    const renderCountPopup: FilterPopupButtonProps['PopoverComponent'] = ({closeOverlay}) => (
        <SingleSelectPopup
            key={countType}
            items={countItems}
            value={countItems.find((item) => item.value === countType)}
            closeOverlay={closeOverlay}
            onChange={handleCountChange}
            defaultValue={defaultCountType}
        />
    );

    const renderTotalTypePopup: FilterPopupButtonProps['PopoverComponent'] = ({closeOverlay}) => (
        <SingleSelectPopup
            key={totalType}
            items={totalItems}
            value={totalItems.find((item) => item.value === totalType)}
            closeOverlay={closeOverlay}
            onChange={handleTotalTypeChange}
            defaultValue={CONST.SEARCH.FOOTER_TOTAL_TYPES.TOTAL}
        />
    );

    const renderCurrencyPopup: FilterPopupButtonProps['PopoverComponent'] = ({closeOverlay, isExpanded}) => (
        <CurrencyPopup
            key={currency ?? defaultCurrency}
            value={currency}
            closeOverlay={closeOverlay}
            onChange={handleCurrencyChange}
            searchPlaceholder={translate('common.search')}
            defaultValue={defaultCurrency}
            shouldShowList={isExpanded}
            shouldUseFixedPopoverHeight
        />
    );

    // Every footer selector shares one trigger: its text plus a down arrow, styled like the static text it replaces.
    const renderSelectorButton =
        (label: string, accessibilityLabel: string, textStyle: StyleProp<TextStyle>, isDisabled: boolean) =>
        // eslint-disable-next-line react/no-unstable-nested-components
        (props: ButtonComponentProps) => (
            <Button
                ref={props.ref}
                accessibilityLabel={accessibilityLabel}
                innerStyles={[styles.bgTransparent, styles.gap1, styles.mnh0, styles.ph0, styles.pv0]}
                contentContainerStyle={styles.gap1}
                isDisabled={isDisabled}
                size={CONST.BUTTON_SIZE.SMALL}
                hoverStyles={styles.bgTransparent}
                onPress={props.onPress}
                onFocus={() => setIsSelectorButtonFocused(true)}
                onBlur={() => setIsSelectorButtonFocused(false)}
            >
                <Button.Text
                    style={textStyle}
                    hoverStyle={styles.textSupporting}
                >
                    {label}
                </Button.Text>
                <Button.Icon
                    src={icons.DownArrow}
                    fill={theme.icon}
                    hoverFill={theme.iconHovered}
                />
            </Button>
        );

    return (
        <View style={[styles.borderTop, styles.ph5, styles.pv3, StyleUtils.getBackgroundColorStyle(theme.appBG)]}>
            <View style={[shouldUseNarrowLayout ? styles.justifyContentStart : styles.justifyContentEnd, styles.flexRow, styles.alignItemsCenter, styles.gap3]}>
                <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1]}>
                    {shouldShowCountSelector ? (
                        <FilterPopupButton
                            PopoverComponent={renderCountPopup}
                            renderButton={renderSelectorButton(`${countLabel}:`, translate('common.countSelector'), styles.textLabelSupporting, false)}
                            popoverAnchorAlignment={POPOVER_ANCHOR_ALIGNMENT}
                        />
                    ) : (
                        <Text style={styles.textLabelSupporting}>{`${countLabel}:`}</Text>
                    )}
                    <Text style={valueTextStyle}>{countValue}</Text>
                </View>
                {typeof total === 'number' && (
                    <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1]}>
                        {shouldShowTotalSelector ? (
                            <FilterPopupButton
                                PopoverComponent={renderTotalTypePopup}
                                renderButton={renderSelectorButton(`${totalLabel}:`, translate('common.totalSelector'), styles.textLabelSupporting, areRequestSelectorsDisabled)}
                                popoverAnchorAlignment={POPOVER_ANCHOR_ALIGNMENT}
                            />
                        ) : (
                            <Text style={styles.textLabelSupporting}>{`${totalLabel}:`}</Text>
                        )}
                        {isTotalLoading ? (
                            <SearchPageFooterSkeleton />
                        ) : (
                            <FilterPopupButton
                                PopoverComponent={renderCurrencyPopup}
                                renderButton={renderSelectorButton(convertToDisplayString(total, currency), translate('common.totalSpend'), valueTextStyle, areRequestSelectorsDisabled)}
                                popoverAnchorAlignment={POPOVER_ANCHOR_ALIGNMENT}
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

export default SearchPageFooter;

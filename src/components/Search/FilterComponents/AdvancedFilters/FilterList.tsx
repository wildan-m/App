import Icon from '@components/Icon';
import {PressableWithFeedback} from '@components/Pressable';
import ScrollView from '@components/ScrollView';
import FilterSearchInput from '@components/SelectionList/components/TextInput';
import SpacerView from '@components/SpacerView';
import Text from '@components/Text';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useAdvancedSearchFilters from '@hooks/useAdvancedSearchFilters';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import getButtonState from '@libs/getButtonState';
import {FILTER_VIEW_MAP, getFilterViewLabelKey} from '@libs/SearchUIUtils';
import type {SearchFilter} from '@libs/SearchUIUtils';

import variables from '@styles/variables';

import type {SearchDataTypes} from '@src/types/onyx/SearchResults';

import type {StyleProp, ViewStyle} from 'react-native';

import React, {useRef, useState} from 'react';
import {View} from 'react-native';

type ItemCallback = (filter: SearchFilter['key']) => void;
type FilterItemCallbacks = {
    onHoverIn?: ItemCallback;
    onFocus?: ItemCallback;
    onPress?: ItemCallback;
};

type FilterListProps = FilterItemCallbacks & {
    type: SearchDataTypes | undefined;
    selectedFilter?: SearchFilter['key'];
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;

    /** Whether the filter search input should skip its default autofocus. Set on the full-screen page so the keyboard doesn't cover the list on mobile. */
    shouldDisableSearchAutoFocus?: boolean;

    /** Called as the cursor travels over the list. Web only - it reports the movement inside a row, which `onHoverIn` only reports entering. */
    onPointerMove?: (event: {clientX: number; clientY: number}) => void;

    /** Called when the cursor leaves the list, so the consumer can settle whatever it was still waiting on for the last row. Web only. */
    onPointerLeave?: (event: {clientX: number}) => void;
};

type FilterItemProps = FilterItemCallbacks & {
    filterKey: SearchFilter['key'];
    isSelected?: boolean;
    type: SearchDataTypes | undefined;
};

function FilterItem({filterKey, isSelected, type, onPress, onHoverIn, onFocus}: FilterItemProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const theme = useTheme();

    const {icon} = FILTER_VIEW_MAP[filterKey];
    const labelKey = getFilterViewLabelKey(filterKey, type);
    const icons = useMemoizedLazyExpensifyIcons(['ArrowRight', icon]);

    const getPressableBackgroundStyle = (pressed: boolean) => {
        if (pressed) {
            return styles.buttonHoveredBG;
        }

        if (isSelected) {
            return styles.hoveredComponentBG;
        }

        return undefined;
    };

    return (
        <PressableWithFeedback
            style={({pressed}) => [styles.typeFilterMenu, getPressableBackgroundStyle(pressed)]}
            accessible
            accessibilityLabel={filterKey}
            onHoverIn={() => onHoverIn?.(filterKey)}
            onFocus={() => onFocus?.(filterKey)}
            onPress={() => onPress?.(filterKey)}
            sentryLabel={`Search-Advanced-Filter-${filterKey}`}
        >
            {({pressed}) => (
                <>
                    <Icon
                        src={icons[icon]}
                        fill={theme.icon}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                    />
                    <Text
                        numberOfLines={2}
                        style={[styles.flex1]}
                    >
                        {translate(labelKey)}
                    </Text>
                    <Icon
                        src={icons.ArrowRight}
                        fill={StyleUtils.getIconFillColor({buttonState: getButtonState({isActive: isSelected, isPressed: pressed})})}
                        width={variables.iconSizeNormal}
                        height={variables.iconSizeNormal}
                    />
                </>
            )}
        </PressableWithFeedback>
    );
}

function FilterList({type, selectedFilter, style, contentContainerStyle, shouldDisableSearchAutoFocus = false, onHoverIn, onFocus, onPress, onPointerMove, onPointerLeave}: FilterListProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const typeFiltersKeys = useAdvancedSearchFilters(type);
    const [searchText, setSearchText] = useState('');
    const searchInputRef = useRef<BaseTextInputRef | null>(null);

    const normalizedSearchText = searchText.trim().toLowerCase();
    const visibleSections = normalizedSearchText
        ? typeFiltersKeys
              .map((section) => section.filter((filterKey) => translate(getFilterViewLabelKey(filterKey, type)).toLowerCase().includes(normalizedSearchText)))
              .filter((section) => section.length > 0)
        : typeFiltersKeys;
    const visibleFiltersCount = visibleSections.reduce((count, section) => count + section.length, 0);

    const focusSearchInput = () => {
        searchInputRef.current?.focus();
    };

    return (
        <View style={style}>
            <FilterSearchInput
                ref={searchInputRef}
                options={{
                    label: translate('search.filters.searchPlaceholder'),
                    value: searchText,
                    onChangeText: setSearchText,
                    disableAutoFocus: shouldDisableSearchAutoFocus,
                    headerMessage: visibleFiltersCount === 0 ? translate('common.noResultsFound') : undefined,
                }}
                shouldShowTextInput
                dataLength={visibleFiltersCount}
                onFocusChange={() => {}}
                focusTextInput={focusSearchInput}
            />
            <ScrollView
                style={styles.flex1}
                contentContainerStyle={[contentContainerStyle]}
                showsVerticalScrollIndicator={false}
                onMouseMove={onPointerMove}
                onMouseLeave={onPointerLeave}
            >
                {visibleSections.map((section, index) => (
                    <View key={`${section.at(0)}`}>
                        {index !== 0 && (
                            <SpacerView
                                shouldShow
                                style={[styles.reportHorizontalRule]}
                            />
                        )}
                        {section.map((item) => (
                            <FilterItem
                                key={item}
                                filterKey={item}
                                type={type}
                                isSelected={item === selectedFilter}
                                onHoverIn={onHoverIn}
                                onFocus={onFocus}
                                onPress={onPress}
                            />
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

export default FilterList;

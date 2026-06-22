import type {FlashListProps} from '@shopify/flash-list';
import React, {useMemo} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import useFlashListScrollKey from '@components/FlashList/useFlashListScrollKey';
import type {FlatListRefType} from '@pages/inbox/ReportScreenContext';
import FlashList from '..';
import CellRendererComponent, {getInvertedCellNativeID} from './CellRendererComponent';

type InvertedFlashListProps<T> = FlashListProps<T> & {
    /** Key of the item to initially scroll to when the list first renders. */
    initialScrollKey?: string | null;

    /** The array of items to render in the list. */
    data: T[];

    /** Function that extracts a unique key for each item in the list. */
    keyExtractor: (item: T, index: number) => string;

    /** Ref to the underlying list instance. */
    ref: FlatListRefType;

    /** Whether the list should handle `maintainVisibleContentPosition` */
    shouldMaintainVisibleContentPosition?: boolean;
};

const styles = StyleSheet.create({
    fill: {flex: 1},
});

function InvertedFlashList<T>({
    data,
    keyExtractor,
    initialScrollKey,
    onStartReached: onStartReachedProp,
    maintainVisibleContentPosition: maintainVisibleContentPositionProp,
    shouldMaintainVisibleContentPosition,
    ...restProps
}: InvertedFlashListProps<T>) {
    const {
        displayedData,
        onStartReached,
        maintainVisibleContentPosition: maintainVisibleContentPositionForScrollKey,
    } = useFlashListScrollKey<T>({
        data,
        keyExtractor,
        initialScrollKey,
        onStartReached: onStartReachedProp,
        shouldMaintainVisibleContentPosition,
    });

    const maintainVisibleContentPosition = maintainVisibleContentPositionProp
        ? {
              ...maintainVisibleContentPositionForScrollKey,
              ...maintainVisibleContentPositionProp,
          }
        : maintainVisibleContentPositionForScrollKey;

    // The list is visually inverted with a transform, which flips the pixels but not the order of the views in the
    // native hierarchy. Native screen readers (TalkBack/VoiceOver) derive their "next"/"previous" traversal order from
    // that underlying order, so without help they read the messages in reverse. We define the accessibility focus order
    // explicitly as the cell IDs in reversed (visual, top-to-bottom) order so the reader matches what the user sees.
    // This is only needed/applicable on native; web keeps its default behavior.
    const accessibilityOrder = useMemo(() => {
        if (Platform.OS === 'web') {
            return undefined;
        }
        return displayedData.map((_, index) => getInvertedCellNativeID(index)).reverse();
    }, [displayedData]);

    const list = (
        <FlashList<T>
            {...restProps}
            inverted
            onStartReached={onStartReached}
            data={displayedData}
            keyExtractor={keyExtractor}
            CellRendererComponent={CellRendererComponent}
            maintainVisibleContentPosition={maintainVisibleContentPosition}
        />
    );

    if (!accessibilityOrder) {
        return list;
    }

    return (
        <View
            style={styles.fill}
            experimental_accessibilityOrder={accessibilityOrder}
        >
            {list}
        </View>
    );
}

export default InvertedFlashList;

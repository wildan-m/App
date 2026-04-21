import type {FlashListProps} from '@shopify/flash-list';
import {useEffect, useState} from 'react';

// How long to keep MVCP enabled after `shouldMaintainVisibleContentPosition` drops back to false
const MVCP_FALLOFF_MS = 500;

type FlashListScrollKeyProps<T> = {
    /** The array of items to render in the list. */
    data: T[];

    /** Function that extracts a unique key for each item in the list. */
    keyExtractor: (item: T, index: number) => string;

    /** Key of the item to initially scroll to when the list first renders. */
    initialScrollKey: string | null | undefined;

    /** Callback invoked when the user scrolls close to the start of the list. */
    onStartReached: FlashListProps<T>['onStartReached'];

    /** Whether the list should handle `maintainVisibleContentPosition` */
    shouldMaintainVisibleContentPosition?: boolean;
};

export default function useFlashListScrollKey<T>({data, keyExtractor, initialScrollKey, onStartReached, shouldMaintainVisibleContentPosition}: FlashListScrollKeyProps<T>) {
    const [isInitialRender, setIsInitialRender] = useState(true);
    const [hasLinkingSettled, setHasLinkingSettled] = useState(!initialScrollKey);

    // Two-frame handoff for deep-link:
    // RAF 1: switch from sliced data to the full array — FlashList's default MVCP pins the
    //        linked item through the data swap.
    // RAF 2: pinning has happened, disable MVCP so it doesn't cause later jumps.
    useEffect(() => {
        if (!isInitialRender || !initialScrollKey) {
            return;
        }
        requestAnimationFrame(() => {
            setIsInitialRender(false);
            requestAnimationFrame(() => setHasLinkingSettled(true));
        });
    }, [isInitialRender, initialScrollKey]);

    // FlashList captures MVCP anchors on the render BEFORE a data change. Keep MVCP on at mount
    // (warmup) and while the caller raises the prop, then disable after a short falloff.
    const [isKeepingMVCPOn, setIsKeepingMVCPOn] = useState(true);
    useEffect(() => {
        if (shouldMaintainVisibleContentPosition) {
            setIsKeepingMVCPOn(true);
            return;
        }
        const timeoutID = setTimeout(() => setIsKeepingMVCPOn(false), MVCP_FALLOFF_MS);
        return () => clearTimeout(timeoutID);
    }, [shouldMaintainVisibleContentPosition]);

    const shouldEnableMVCP = !!shouldMaintainVisibleContentPosition || isKeepingMVCPOn || !hasLinkingSettled;
    const maintainVisibleContentPosition: FlashListProps<T>['maintainVisibleContentPosition'] = {disabled: !shouldEnableMVCP};

    if (!isInitialRender || !initialScrollKey) {
        return {displayedData: data, onStartReached, maintainVisibleContentPosition};
    }

    const targetIndex = data.findIndex((item, index) => keyExtractor(item, index) === initialScrollKey);
    if (targetIndex <= 0) {
        return {displayedData: data, onStartReached, maintainVisibleContentPosition};
    }

    // On the first render, slice from the target onward so the target item
    // appears at the visual bottom of the inverted list — no scrolling needed.
    return {displayedData: data.slice(targetIndex), onStartReached: () => {}, maintainVisibleContentPosition};
}

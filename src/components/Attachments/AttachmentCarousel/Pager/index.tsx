import CarouselItem from '@components/Attachments/AttachmentCarousel/CarouselItem';
import useCarouselContextEvents from '@components/Attachments/AttachmentCarousel/useCarouselContextEvents';
import type {Attachment, AttachmentSource} from '@components/Attachments/types';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ForwardedRef, SetStateAction} from 'react';
import type {NativeSyntheticEvent} from 'react-native';
import type {PageScrollStateChangedNativeEvent, PagerViewOnPageSelectedEvent} from 'react-native-pager-view';

import React, {useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import PagerView from 'react-native-pager-view';
import Animated, {useAnimatedProps, useSharedValue} from 'react-native-reanimated';

import type {AttachmentCarouselPagerActionsContextType, AttachmentCarouselPagerStateContextType} from './types';

import {AttachmentCarouselPagerActionsContext, AttachmentCarouselPagerStateContext} from './AttachmentCarouselPagerContext';
import usePageScrollHandler from './usePageScrollHandler';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

type AttachmentCarouselPagerHandle = {
    setPage: (selectedPage: number) => void;
};

type AttachmentCarouselPagerProps = {
    /** The attachments to be rendered in the pager. */
    items: Attachment[];

    /** The id or source (URL) of the currently active attachment. */
    activeAttachmentID: AttachmentSource;

    /** The index of the initial page to be rendered. */
    initialPage: number;

    onPageSelected?: (
        event: NativeSyntheticEvent<
            Readonly<{
                position: number;
            }>
        >,
    ) => void;

    /** A callback that is called when swipe-down-to-close gesture happens */
    onSwipeDown?: () => void;

    /** Sets the visibility of the arrows. */
    setShouldShowArrows?: (show?: SetStateAction<boolean>) => void;

    /** The reportID related to the attachment */
    reportID?: string;

    onAttachmentError?: (source: AttachmentSource) => void;
    ref?: ForwardedRef<AttachmentCarouselPagerHandle>;
};

function AttachmentCarouselPager({items, activeAttachmentID, initialPage, setShouldShowArrows, onPageSelected, onSwipeDown, reportID, onAttachmentError, ref}: AttachmentCarouselPagerProps) {
    const {handleTap, handleScaleChange, isScrollEnabled} = useCarouselContextEvents(setShouldShowArrows);
    const styles = useThemeStyles();
    const pagerRef = useRef<PagerView>(null);

    const isPagerScrolling = useSharedValue(false);

    /** Whether the user is currently dragging the pager */
    const isDraggingRef = useRef(false);

    /** Whether the user started a drag whose page selection has not been fully reported yet */
    const isUserPageChangePendingRef = useRef(false);

    /** Whether a page was selected while the current drag was still in progress */
    const didSelectPageWhileDraggingRef = useRef(false);

    /** The page requested through the imperative `setPage` handle, whose selection should be forwarded */
    const requestedPageRef = useRef<number | null>(null);

    /** The page the pager was moved back to after an unrequested page change, whose selection should be ignored */
    const restoredPageRef = useRef<number | null>(null);

    const activePage = useSharedValue(initialPage);
    const [activePageIndex, setActivePageIndex] = useState(initialPage);

    const pageScrollHandler = usePageScrollHandler((e) => {
        'worklet';

        activePage.set(e.position);
        isPagerScrolling.set(e.offset !== 0);
    }, []);

    useEffect(() => {
        setActivePageIndex(initialPage);
        activePage.set(initialPage);
    }, [activePage, initialPage]);

    /** The `pagerItems` object that passed down to the context. Later used to detect current page, whether it's a single image gallery etc. */
    const pagerItems = useMemo(
        () => items.map((item, index) => ({source: item.source, previewSource: item.previewSource, index, isActive: index === activePageIndex, attachmentID: item.attachmentID})),
        [activePageIndex, items],
    );

    const extractItemKey = useCallback((item: Attachment, index: number) => `attachmentID-${item.attachmentID}-${index}`, []);

    const nativeGestureHandler = Gesture.Native();

    const stateValue = useMemo<AttachmentCarouselPagerStateContextType>(
        () => ({
            pagerItems,
            activePage: activePageIndex,
            isPagerScrolling,
            isScrollEnabled,
            pagerRef,
            externalGestureHandler: nativeGestureHandler,
        }),
        [pagerItems, activePageIndex, isPagerScrolling, isScrollEnabled, nativeGestureHandler],
    );

    const actionsValue = useMemo<AttachmentCarouselPagerActionsContextType>(
        () => ({
            onTap: handleTap,
            onSwipeDown,
            onScaleChanged: handleScaleChange,
            onAttachmentError,
        }),
        [handleTap, onSwipeDown, handleScaleChange, onAttachmentError],
    );

    const handlePageScrollStateChanged = (event: PageScrollStateChangedNativeEvent) => {
        const {pageScrollState} = event.nativeEvent;

        if (pageScrollState === 'dragging') {
            isDraggingRef.current = true;
            isUserPageChangePendingRef.current = true;
            didSelectPageWhileDraggingRef.current = false;
            requestedPageRef.current = null;
            restoredPageRef.current = null;
            return;
        }

        if (pageScrollState !== 'idle') {
            return;
        }

        isDraggingRef.current = false;

        // When the page was not selected during the drag, the selection can still arrive after the pager settles, so keep expecting it
        if (didSelectPageWhileDraggingRef.current) {
            isUserPageChangePendingRef.current = false;
        }
    };

    const handlePageSelected = (event: PagerViewOnPageSelectedEvent) => {
        const {position} = event.nativeEvent;

        if (position === requestedPageRef.current) {
            requestedPageRef.current = null;
            onPageSelected?.(event);
            return;
        }

        if (position === restoredPageRef.current) {
            restoredPageRef.current = null;
            return;
        }

        if (position === initialPage || isUserPageChangePendingRef.current) {
            if (isDraggingRef.current) {
                didSelectPageWhileDraggingRef.current = true;
            } else {
                isUserPageChangePendingRef.current = false;
            }
            onPageSelected?.(event);
            return;
        }

        // The page changed without a swipe or a programmatic request. On iOS this happens when the pager's frame changes
        // (e.g. on device rotation or when the keyboard shows), so move the pager back to the current page instead of navigating away.
        restoredPageRef.current = initialPage;
        pagerRef.current?.setPageWithoutAnimation(initialPage);
    };

    const animatedProps = useAnimatedProps(() => ({
        scrollEnabled: isScrollEnabled.get(),
    }));

    /**
     * This "useImperativeHandle" call is needed to expose certain imperative methods via the pager's ref.
     * setPage: can be used to programmatically change the page from a parent component
     */
    useImperativeHandle<AttachmentCarouselPagerHandle, AttachmentCarouselPagerHandle>(
        ref,
        () => ({
            setPage: (selectedPage) => {
                requestedPageRef.current = selectedPage;
                restoredPageRef.current = null;
                pagerRef.current?.setPage(selectedPage);
            },
        }),
        [],
    );

    const carouselItems = items.map((item, index) => (
        <View
            key={extractItemKey(item, index)}
            style={styles.flex1}
        >
            <CarouselItem
                item={item}
                isFocused={index === activePageIndex && activeAttachmentID === (item.attachmentID ?? item.source)}
                reportID={reportID}
            />
        </View>
    ));

    return (
        <AttachmentCarouselPagerStateContext.Provider value={stateValue}>
            <AttachmentCarouselPagerActionsContext.Provider value={actionsValue}>
                <GestureDetector gesture={nativeGestureHandler}>
                    <AnimatedPagerView
                        pageMargin={40}
                        offscreenPageLimit={1}
                        onPageScroll={pageScrollHandler}
                        onPageSelected={handlePageSelected}
                        onPageScrollStateChanged={handlePageScrollStateChanged}
                        style={styles.flex1}
                        initialPage={initialPage}
                        animatedProps={animatedProps}
                        ref={pagerRef}
                    >
                        {carouselItems}
                    </AnimatedPagerView>
                </GestureDetector>
            </AttachmentCarouselPagerActionsContext.Provider>
        </AttachmentCarouselPagerStateContext.Provider>
    );
}

export default AttachmentCarouselPager;
export type {AttachmentCarouselPagerHandle};

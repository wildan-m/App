import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useRef} from 'react';
import type {LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import {FlatList} from 'react-native';
import KeyboardDismissibleFlatList from '@components/KeyboardDismissibleFlatList';
import useThemeStyles from '@hooks/useThemeStyles';
import type {CustomFlatListProps} from './types';

// FlatList wrapped with the freeze component will lose its scroll state when frozen (only for Android).
// CustomFlatList saves the offset and use it for scrollToOffset() when unfrozen.
function CustomFlatList<T>({
    ref,
    enableAnimatedKeyboardDismissal = false,
    onMomentumScrollEnd,
    onScroll,
    onContentSizeChange,
    onLayout: onLayoutProp,
    shouldHideContent = false,
    ...props
}: CustomFlatListProps<T>) {
    const lastScrollOffsetRef = useRef(0);
    const contentHeightRef = useRef(0);
    const layoutHeightRef = useRef(0);
    const styles = useThemeStyles();

    const onScreenFocus = useCallback(() => {
        if (typeof ref === 'function') {
            return;
        }
        if (!ref?.current || !lastScrollOffsetRef.current) {
            return;
        }
        if (ref.current && lastScrollOffsetRef.current) {
            ref.current.scrollToOffset({offset: lastScrollOffsetRef.current, animated: false});
        }
    }, [ref]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleScrollEnd = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            onMomentumScrollEnd?.(event);
            lastScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        },
        [onMomentumScrollEnd],
    );

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        lastScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
    };

    const handleContentSizeChange = useCallback(
        (w: number, h: number) => {
            const prevHeight = contentHeightRef.current;
            contentHeightRef.current = h;

            // When content shrinks (e.g., list items removed while the screen was frozen),
            // clamp the saved scroll offset to the valid range so that restoring it
            // via onScreenFocus doesn't scroll past the content bounds, which would
            // create empty space at the top of an inverted list.
            if (prevHeight > 0 && h < prevHeight && layoutHeightRef.current > 0) {
                const maxOffset = Math.max(0, h - layoutHeightRef.current);
                if (lastScrollOffsetRef.current > maxOffset) {
                    lastScrollOffsetRef.current = maxOffset;
                    if (typeof ref !== 'function' && ref?.current) {
                        ref.current.scrollToOffset({offset: maxOffset, animated: false});
                    }
                }
            }

            onContentSizeChange?.(w, h);
        },
        [ref, onContentSizeChange],
    );

    const handleLayout = useCallback(
        (event: LayoutChangeEvent) => {
            layoutHeightRef.current = event.nativeEvent.layout.height;
            onLayoutProp?.(event);
        },
        [onLayoutProp],
    );

    useFocusEffect(
        useCallback(() => {
            onScreenFocus();
        }, [onScreenFocus]),
    );

    const contentContainerStyle = [props.contentContainerStyle, shouldHideContent && styles.opacity0];

    if (enableAnimatedKeyboardDismissal) {
        return (
            <KeyboardDismissibleFlatList
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...props}
                ref={ref}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleScrollEnd}
                onContentSizeChange={handleContentSizeChange}
                onLayout={handleLayout}
                contentContainerStyle={contentContainerStyle}
            />
        );
    }

    return (
        <FlatList<T>
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            ref={ref}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScrollEnd}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleLayout}
            contentContainerStyle={contentContainerStyle}
        />
    );
}

export default CustomFlatList;

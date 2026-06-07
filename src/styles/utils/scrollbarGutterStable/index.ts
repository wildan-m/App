import type ScrollbarGutterStableStyles from './types';

/**
 * Reserve space for the scrollbar gutter on web so the content width stays
 * constant whether or not the scrollbar is visible. This prevents layout
 * shifts when content grows/shrinks and toggles the scrollbar's presence.
 */
const scrollbarGutterStable: ScrollbarGutterStableStyles = {
    scrollbarGutter: 'stable',
};

export default scrollbarGutterStable;

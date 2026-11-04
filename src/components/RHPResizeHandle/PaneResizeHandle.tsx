import getDraggedSize from '@components/ResizeHandle/getDraggedSize';
import type {DraggedSizeSnap} from '@components/ResizeHandle/getDraggedSize';
import usePointerDrag from '@components/ResizeHandle/usePointerDrag';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import type {RefObject} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {View} from 'react-native';

type Drag = {
    startClientX: number;

    startWidth: number;

    /** Whether the pointer passed the drag slop. Until then, releasing it is a click. */
    hasMovedPointer: boolean;

    /** Last width painted into CSS, `undefined` until the pointer moves. */
    liveWidth?: number;
};

type PaneResizeHandleProps = {
    /** The pane's committed width. */
    width: number;

    /** How narrow and how wide a drag can make the pane. */
    min: number;
    max: number;

    /** The pane's default width, which a drag snaps onto. */
    defaultWidth: number;

    /** Places the handle over the pane's left edge. */
    style: StyleProp<ViewStyle>;

    /** Paints a mid-drag width straight onto the DOM, ahead of React. */
    writeLiveWidth: (width: number) => void;

    /** Drops the mid-drag width, so styles fall back to the committed one. */
    clearLiveWidth: () => void;

    /** Saves the width a drag ended on. */
    saveWidth: (width: number) => void;

    /** Drops the saved width, back to the default. */
    resetWidth: () => void;
};

/** The RHP and a modal stacked on it each mount a handle over the one live width, so an idle handle must not clear it while the other drags. */
let lastDragRef: RefObject<Drag | null> | null = null;

// DOM `div` styles, which the React Native style system can't type.
const HANDLE_STYLE: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    touchAction: 'none',
};

// Flush against the outside of the pane's border, which the handle straddles, so the line runs straight past the pane's rounded corners.
const LINE_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '50%',
    borderRadius: CONST.RHP_RESIZE.SNAPPED_INDICATOR_WIDTH / 2,
    pointerEvents: 'none',
};

/**
 * Drags a right-docked pane's left edge. A sibling of the pane rather than a child, because the pane clips its overflow,
 * and rendered after any overlay so it wins hit-testing over the scrim.
 */
function PaneResizeHandle({width, min, max, defaultWidth, style, writeLiveWidth, clearLiveWidth, saveWidth, resetWidth}: PaneResizeHandleProps) {
    const styles = useThemeStyles();
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const dragRef = useRef<Drag | null>(null);
    const lineRef = useRef<HTMLDivElement>(null);

    const snap: DraggedSizeSnap = {to: defaultWidth, threshold: CONST.RHP_RESIZE.SNAP_THRESHOLD};

    /** Thickens the line while a drag is held on the default width. Set on the DOM, so a drag stays free of React renders. */
    const setLineSnapped = (isSnapped: boolean) => {
        lineRef.current?.style.setProperty('width', `${isSnapped ? CONST.RHP_RESIZE.SNAPPED_INDICATOR_WIDTH : CONST.RHP_RESIZE.ACTIVE_INDICATOR_WIDTH}px`);
    };

    const pointerDrag = usePointerDrag<Drag>({
        dragRef,
        onMove: (drag, clientX) => {
            // A mouse click rarely lands on the exact pixel it started from, so nothing is painted inside the slop.
            if (!drag.hasMovedPointer) {
                if (Math.abs(clientX - drag.startClientX) <= CONST.RESIZE_HANDLE.DRAG_SLOP) {
                    return;
                }

                // Kept once set, so a drag that comes back to where it started isn't a click.
                // eslint-disable-next-line no-param-reassign -- the drag is the ref's own object
                drag.hasMovedPointer = true;
            }

            const liveWidth = getDraggedSize(drag.startWidth, drag.startClientX - clientX, {min, max, snap});

            // Pressing an edge already on the default and moving within the threshold changes nothing, so the snapped line waits for a real snap.
            if (liveWidth === (drag.liveWidth ?? drag.startWidth)) {
                return;
            }

            writeLiveWidth(liveWidth);
            setLineSnapped(liveWidth === snap.to);
            // eslint-disable-next-line no-param-reassign -- the drag is the ref's own object, read back when the drag ends
            drag.liveWidth = liveWidth;
        },
        onEnd: ({hasMovedPointer, liveWidth}, event, isRelease) => {
            setIsDragging(false);

            // A cancelled press or reclaimed capture isn't a click, so only a release resets.
            if (!hasMovedPointer && isRelease) {
                resetWidth();
                return;
            }

            // Nothing gets saved, so no render follows to clear the live width.
            if (liveWidth === undefined || liveWidth === width) {
                clearLiveWidth();
                return;
            }

            if (liveWidth === snap.to) {
                resetWidth();
                return;
            }

            saveWidth(liveWidth);
        },
    });

    // React now renders the saved width as the fallback, so drop the live one before paint. A window resize mid-drag leaves it to the drag.
    useLayoutEffect(() => {
        if (lastDragRef?.current) {
            return;
        }

        clearLiveWidth();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new committed width makes the live one stale
    }, [width]);

    // The document outlives the handle, so unmounting before the save renders would otherwise pin the pane at the live width.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleans up on unmount only
    useEffect(() => clearLiveWidth, []);

    return (
        <View style={style}>
            {/* A plain `div` because it relies on DOM pointer capture. */}
            <div
                style={{...HANDLE_STYLE, ...styles.cursorColResize}}
                onPointerEnter={() => setIsHovered(true)}
                onPointerLeave={() => setIsHovered(false)}
                onPointerDown={(event) => {
                    if (!pointerDrag.startDrag(event, () => ({startClientX: event.clientX, startWidth: width, hasMovedPointer: false}))) {
                        return;
                    }
                    lastDragRef = dragRef;
                    setIsDragging(true);
                }}
                {...pointerDrag.handlers}
            >
                {(isHovered || isDragging) && (
                    <div
                        ref={lineRef}
                        aria-hidden
                        style={{...LINE_STYLE, width: isDragging ? CONST.RHP_RESIZE.ACTIVE_INDICATOR_WIDTH : CONST.RESIZE_HANDLE.INDICATOR_WIDTH, ...styles.resizeIndicator}}
                    />
                )}
            </div>
        </View>
    );
}

export default PaneResizeHandle;
export type {PaneResizeHandleProps};

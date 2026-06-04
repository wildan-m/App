import React, {useLayoutEffect, useRef, useState} from 'react';
import {Freeze} from 'react-freeze';
import TooltipSense from '@components/Tooltip/TooltipSense';
import {isMobileSafari} from '@libs/Browser';
import {areAllModalsHidden} from '@userActions/Modal';
import ScreenFreezeContext from './ScreenFreezeContext';
import type ScreenFreezeWrapperProps from './types';

// iOS Safari has a native, interactive edge-swipe-back gesture that progressively
// reveals the previous (underlay) screen. Freezing that screen while the gesture is
// in flight makes Safari flash a stale snapshot the moment the gesture completes and
// the screen is unfrozen and re-rendered. Mirror the native FREEZE_DELAY_MS behavior
// (see index.native.tsx) so the underlay screen stays live and painted for the whole
// gesture, leaving nothing to re-reconcile when it settles — and therefore no flicker.
const SAFARI_FREEZE_DELAY_MS = 500;

function ScreenFreezeWrapper({isScreenBlurred, children}: ScreenFreezeWrapperProps) {
    const [frozen, setFrozen] = useState(false);
    const freezeDeferCountRef = useRef(0);

    const registerFreezeDefer = () => {
        freezeDeferCountRef.current++;
        return () => {
            freezeDeferCountRef.current--;
        };
    };

    const contextValue = {registerFreezeDefer};

    // Decouple the Suspense render task so it won't be interrupted by React's concurrent mode
    // and stuck in an infinite loop
    useLayoutEffect(() => {
        // When unfreezing, always apply immediately so the screen is visible right away.
        if (!isScreenBlurred) {
            // Synchronous unfreeze is intentional; the early return prevents infinite loops since
            // isScreenBlurred is the only dependency and won't change as a result of this setState.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFrozen(false);
            return;
        }

        // On iOS Safari, defer freezing the blurred (underlay) screen so it stays visible
        // throughout the interactive swipe-back gesture. Wait FREEZE_DELAY_MS, then freeze
        // after the next frame paint — matching index.native.tsx — and clear the timers if the
        // screen is re-focused before they fire. This eliminates the swipe-back flicker on
        // iOS Safari; other web platforms (no interactive back-swipe) keep freezing promptly.
        if (isMobileSafari()) {
            let rafID: number;
            const timeoutID = setTimeout(() => {
                rafID = requestAnimationFrame(() => setFrozen(true));
            }, SAFARI_FREEZE_DELAY_MS);
            return () => {
                clearTimeout(timeoutID);
                cancelAnimationFrame(rafID);
            };
        }

        // When there are active freeze defers (e.g. keyboard shortcuts that need to unsubscribe),
        // or when a modal/tooltip is still open, defer the freezing by one frame.
        if (freezeDeferCountRef.current > 0 || TooltipSense.isActive() || !areAllModalsHidden()) {
            const id = requestAnimationFrame(() => setFrozen(isScreenBlurred));
            return () => {
                cancelAnimationFrame(id);
            };
        }

        // No blockers or overlays — freeze immediately.
        // isScreenBlurred is the only dependency and setFrozen(true) won't trigger further isScreenBlurred changes.

        setFrozen(isScreenBlurred);
    }, [isScreenBlurred]);

    return (
        <ScreenFreezeContext.Provider value={contextValue}>
            <Freeze freeze={frozen}>{children}</Freeze>
        </ScreenFreezeContext.Provider>
    );
}

export default ScreenFreezeWrapper;

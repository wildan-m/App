import {startTransition, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import TransitionTracker from '@libs/Navigation/TransitionTracker';

type NavigationDeferredMountProps = {
    /** Shown until `children` hydrate. Render something cheap with stable sizing to avoid layout jumps. */
    placeholder?: ReactNode;

    /** The tree to defer. Mounted as a non-urgent transition after the in-flight (or upcoming) navigation transition ends. */
    children: ReactNode;
};

/**
 * Navigation-aware variant of `DeferredMount`. Gates the swap on navigation transition completion via
 * `TransitionTracker`, so the heavy tree hydrates only after the nav animation has finished. The swap
 * is wrapped in `startTransition` so React still treats the hydrate as non-urgent and can yield to user input.
 *
 * Use it for: heavy subtrees mounted during navigation transitions (report headers, page-level actions)
 * where `DeferredMount`'s post-first-commit timing is too loose and the hydrate risks competing with
 * the nav animation frame budget.
 *
 * Do NOT use it for: modals, accordions, dropdowns, or other non-nav surfaces — use `DeferredMount` instead.
 * If no transition is in flight or upcoming, this component waits for the `MAX_TRANSITION_START_WAIT_MS`
 * safety timeout before hydrating, which adds latency with no benefit outside navigation contexts.
 */
function NavigationDeferredMount({placeholder = null, children}: NavigationDeferredMountProps): ReactNode {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const handle = TransitionTracker.runAfterTransitions({
            waitForUpcomingTransition: true,
            callback: () => startTransition(() => setIsReady(true)),
        });
        return () => handle.cancel();
    }, []);

    return isReady ? children : placeholder;
}

export default NavigationDeferredMount;
export type {NavigationDeferredMountProps};

import {startTransition, useEffect, useState} from 'react';
import type {ReactNode} from 'react';

type DeferredMountProps = {
    /** Shown until `children` hydrate. Render something cheap with stable sizing to avoid layout jumps. */
    placeholder?: ReactNode;

    /** The tree to defer. Mounted as a non-urgent transition after the placeholder has committed. */
    children: ReactNode;
};

/**
 * Defers mounting `children` until after the first paint so a cheap `placeholder` shows immediately.
 * The swap runs inside `startTransition`, letting React yield to user input / animations while the heavy tree hydrates.
 *
 * Use it for: non-critical subtrees on hot paths (dropdowns, secondary actions, off-screen panels) that pull
 * many `useOnyx` subscriptions or heavy domain hooks but don't need to be interactive on first render.
 *
 * Do NOT use it for: anything required for first paint/interaction (primary CTA, form fields, navigation).
 * The placeholder is briefly non-interactive — taps on it during hydration are no-ops.
 *
 * Placeholder guidance: match the hydrated tree's outer dimensions (width, height, padding) to avoid
 * layout shift on swap. Keep it hook-light — context hooks (`useThemeStyles`, `useLocalize`) are fine,
 * Onyx subs are not.
 */
function DeferredMount({placeholder = null, children}: DeferredMountProps): ReactNode {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        startTransition(() => setIsReady(true));
    }, []);

    return isReady ? children : placeholder;
}

export default DeferredMount;
export type {DeferredMountProps};

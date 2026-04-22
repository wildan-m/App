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

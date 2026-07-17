import addViewportResizeListener from '@libs/VisualViewport';

import {useSyncExternalStore} from 'react';

/**
 * A hook that returns the height currently hidden at the bottom of the layout viewport by the browser's
 * navigation/toolbar (the difference between the layout viewport and the visual viewport at the bottom edge).
 */
function subscribe(callback: () => void) {
    const unsubscribe = addViewportResizeListener(callback);
    window.visualViewport?.addEventListener('scroll', callback);
    return () => {
        window.visualViewport?.removeEventListener('scroll', callback);
        unsubscribe();
    };
}

function getSnapshot() {
    if (!window.visualViewport) {
        return 0;
    }
    return Math.max(0, window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop));
}

export default () => useSyncExternalStore(subscribe, getSnapshot);

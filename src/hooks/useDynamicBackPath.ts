import stripDynamicRouteSuffixFromPath from '@libs/Navigation/helpers/dynamicRoutesUtils/stripDynamicRouteSuffixFromPath';
import getPathFromState from '@libs/Navigation/helpers/getPathFromState';
import type {State} from '@libs/Navigation/types';

import type {DynamicRouteSuffix, Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

import {useState} from 'react';

import useRootNavigationState from './useRootNavigationState';

/**
 * Removes the given dynamic suffix from the end of the current URL to produce a "back" path.
 *
 * Supported suffix types: static (`/edit`), parametric (`/:reportID`),
 * and parametric with optional params (`/:reportID/:reportActionID?`).
 *
 * If the suffix doesn't match the tail of the current path, returns the last back path computed while it did, so a
 * screen covered by another one (e.g. a modal stacked over it) keeps pointing back to its own parent instead of to
 * the covering screen. If the suffix has never matched, returns the path as-is.
 *
 * @param dynamicRouteSuffix - The dynamic route pattern to remove from the current URL.
 * @param isEnabled - Pass false from a caller that discards the result, to skip the work behind it. Serializing the
 * navigation tree and matching every suffix against it runs on each navigation event, for each mounted caller.
 * @returns The back path for the dynamic route.
 */
function useDynamicBackPath(dynamicRouteSuffix: DynamicRouteSuffix, isEnabled = true): Route {
    const path = useRootNavigationState((state) => {
        if (!isEnabled || !state) {
            return undefined;
        }

        return getPathFromState(state as State);
    });
    const [lastMatchedBackPath, setLastMatchedBackPath] = useState<Route>();

    if (!path) {
        return ROUTES.HOME;
    }

    const backPath = stripDynamicRouteSuffixFromPath(path, dynamicRouteSuffix);
    // A matched suffix is always stripped, so an unchanged path means the focused route isn't the one this hook serves.
    const isSuffixMatched = backPath !== path.replaceAll(/^\/+/g, '');
    if (isSuffixMatched) {
        if (backPath !== lastMatchedBackPath) {
            setLastMatchedBackPath(backPath);
        }
        return backPath;
    }

    return lastMatchedBackPath ?? backPath;
}

export default useDynamicBackPath;

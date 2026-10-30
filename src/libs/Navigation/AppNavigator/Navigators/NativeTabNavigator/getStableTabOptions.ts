import type {NativeBottomTabNavigationOptions} from '@react-navigation/bottom-tabs/unstable';

import {deepEqual} from 'fast-equals';

/** The options each tab was last given. */
const lastTabOptions = new Map<string, NativeBottomTabNavigationOptions>();

/**
 * Hands a tab the options it was last given while they stay equal. React Navigation builds every tab's options again on
 * each render of the navigator, and the native tab view re-renders a tab only when one of its options changed by
 * reference, so a tab keeps its objects until something it draws changes.
 */
function getStableTabOptions(tabName: string, options: NativeBottomTabNavigationOptions): NativeBottomTabNavigationOptions {
    const lastOptions = lastTabOptions.get(tabName);
    if (lastOptions && deepEqual(lastOptions, options)) {
        return lastOptions;
    }
    lastTabOptions.set(tabName, options);
    return options;
}

export default getStableTabOptions;

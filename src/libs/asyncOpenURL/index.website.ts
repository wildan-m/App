import {Linking} from 'react-native';
import type {Linking as LinkingWeb} from 'react-native-web';
import getPlatform from '@libs/getPlatform';
import Log from '@libs/Log';
import CONST from '@src/CONST';
import type AsyncOpenURL from './types';

/**
 * Opens a URL after `promise` resolves, while keeping the popup tied to the
 * original user gesture so browsers don't block it.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const asyncOpenURL: AsyncOpenURL = (promise, url, _shouldSkipCustomSafariLogic, shouldOpenInSameTab) => {
    if (!url) {
        return;
    }

    const canOpenURLInSameTab = getPlatform() === CONST.PLATFORM.WEB;

    if (shouldOpenInSameTab && canOpenURLInSameTab) {
        promise
            .then((params) => {
                (Linking.openURL as LinkingWeb['openURL'])(typeof url === 'string' ? url : url(params), '_self');
            })
            .catch(() => {
                Log.warn('[asyncOpenURL] error occurred while opening URL', {url});
            });
        return;
    }

    // Open the popup synchronously so the user-gesture is preserved on every browser.
    // Waiting for `promise` to resolve before calling `window.open` lets the gesture lapse,
    // which Chrome silently blocks and Safari used to fall back to `_self` (hijacking the main tab).
    const windowRef = window.open();
    promise
        .then((params) => {
            const finalURL = typeof url === 'string' ? url : url(params);
            if (!windowRef) {
                Log.warn('[asyncOpenURL] popup was blocked — leaving the main tab in place', {url});
                return;
            }
            windowRef.location = finalURL;
        })
        .catch(() => {
            windowRef?.close();
            Log.warn('[asyncOpenURL] error occurred while opening URL', {url});
        });
};

export default asyncOpenURL;

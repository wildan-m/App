import Log from '@libs/Log';
import type AsyncOpenURL from './types';
import ELECTRON_EVENTS from '@desktop/ELECTRON_EVENTS';

const asyncOpenURL: AsyncOpenURL = (promise, url) => {
    if (!url) {
        return;
    }
    promise
        .then((params) => {
            window.electron.send(ELECTRON_EVENTS.OPEN_EXTERNAL_LINK, typeof url === 'string' ? url : url(params));
        })
        .catch(() => {
            Log.warn('[asyncOpenURL] error occured while opening URL', {url});
        });
};

export default asyncOpenURL;

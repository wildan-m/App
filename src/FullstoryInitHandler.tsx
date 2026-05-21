import * as Sentry from '@sentry/react-native';
import {useEffect} from 'react';
import CONST from './CONST';
import useOnyx from './hooks/useOnyx';
import FS from './libs/Fullstory';
import Log from './libs/Log';
import ONYXKEYS from './ONYXKEYS';

/**
 * Component that does not render anything but isolates the USER_METADATA Onyx subscription
 * from the root Expensify component. Initializes Fullstory and sets the
 * Sentry Fullstory context whenever user metadata changes.
 */
function FullstoryInitHandler() {
    const [userMetadata] = useOnyx(ONYXKEYS.USER_METADATA);

    useEffect(() => {
        FS.init(userMetadata);
        FS.getSessionURL()
            .then((url) => {
                if (!url) {
                    return;
                }
                Sentry.setContext(CONST.TELEMETRY.CONTEXT_FULLSTORY, {url});
            })
            .catch((error) => {
                // When the Fullstory session is shut down (ad-blocker, opt-out, prior FS('shutdown')),
                // getSessionURL rejects with "Shutdown called". There is no session URL to record in that
                // case, so swallow the rejection and log it instead of letting it crash the app.
                Log.warn('Failed to get Fullstory session URL', {error});
            });
    }, [userMetadata]);

    return null;
}

export default FullstoryInitHandler;

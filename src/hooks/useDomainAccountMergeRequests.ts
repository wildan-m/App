import {getServerAnchoredDBTime} from '@libs/NetworkState';
import Visibility from '@libs/Visibility';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {getNextDomainAccountMergeRequestExpirationTime} from '@selectors/DomainAccountMergeRequest';
import {fromZonedTime} from 'date-fns-tz';
import {useEffect, useState} from 'react';

import useOnyx from './useOnyx';
import usePermissions from './usePermissions';

function getServerNow(): number {
    return fromZonedTime(getServerAnchoredDBTime(), 'UTC').getTime();
}

/**
 * The entry point every surface reads domain account merge requests through. With the beta off it returns no requests and leaves Onyx untouched, so turning the beta
 * back on restores whatever is still unexpired. `now` moves forward when a request expires, because crossing that moment doesn't change Onyx and nothing else would re-render.
 */
function useDomainAccountMergeRequests() {
    const {isBetaEnabled} = usePermissions();
    const [allRequests] = useOnyx(ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST);
    const [now, setNow] = useState(getServerNow);

    const requests = isBetaEnabled(CONST.BETAS.MERGE_DOMAIN_ACCOUNTS) ? allRequests : undefined;
    const nextExpirationTime = getNextDomainAccountMergeRequestExpirationTime(requests, now);

    useEffect(() => {
        if (nextExpirationTime === undefined) {
            return;
        }
        // The upper bound keeps a wildly wrong device clock from overflowing setTimeout, which would fire immediately and loop.
        const delay = Math.min(Math.max(nextExpirationTime - getServerNow(), 0), CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.EXPIRATION_MS);
        const timer = setTimeout(() => setNow(getServerNow()), delay);
        return () => clearTimeout(timer);
    }, [nextExpirationTime, now]);

    // Timers don't run reliably while the app is in the background.
    useEffect(() => Visibility.onVisibilityChange(() => setNow(getServerNow())), []);

    return {requests, now};
}

export default useDomainAccountMergeRequests;

import {getDomainAccountMergeRequestExpirationTime, getOutstandingDomainAccountMergeRequest} from '@libs/DomainAccountMergeRequestUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainAccountMergeRequest} from '@src/types/onyx';

import {useEffect, useState} from 'react';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';
import usePermissions from './usePermissions';

/** Returns the current user's outstanding domain account merge request, and stops returning it the moment it expires even if the screen stays open. */
function useOutstandingDomainAccountMergeRequest(): DomainAccountMergeRequest | undefined {
    const {isBetaEnabled} = usePermissions();
    const {accountID} = useCurrentUserPersonalDetails();
    const [requests] = useOnyx(ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST);
    const [now, setNow] = useState(() => Date.now());

    const request = isBetaEnabled(CONST.BETAS.MERGE_DOMAIN_ACCOUNTS) ? getOutstandingDomainAccountMergeRequest(requests, accountID, now) : undefined;
    const expirationTime = request ? getDomainAccountMergeRequestExpirationTime(request) : undefined;

    useEffect(() => {
        if (expirationTime === undefined) {
            return;
        }
        const timer = setTimeout(() => setNow(Date.now()), Math.max(expirationTime - Date.now(), 0));
        return () => clearTimeout(timer);
    }, [expirationTime]);

    return request;
}

export default useOutstandingDomainAccountMergeRequest;

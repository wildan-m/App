import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {isRecord} from '@libs/ObjectUtils';
import type {Middleware} from '@libs/Request';

import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/**
 * Use this only in non-React contexts (request middleware) where `useOnyx` is not available;
 * React code should read the list via `useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST)` and pass it down.
 */
let allPersonalDetails: OnyxEntry<PersonalDetailsList>;
Onyx.connectWithoutView({
    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    callback: (value) => {
        allPersonalDetails = value;
    },
});

/**
 * Returns the logins (lower-cased) this request looked an account up by. Only the commands that resolve a typed
 * login to an account are considered; any other request returns an empty set and is left untouched.
 */
function getLookedUpLogins(command: string, data: Record<string, unknown> | undefined): Set<string> {
    const logins = new Set<string>();
    if (command === READ_COMMANDS.SEARCH_FOR_REPORTS || command === READ_COMMANDS.SEARCH_FOR_USERS) {
        const searchInput = data?.searchInput;
        if (typeof searchInput === 'string' && searchInput.trim()) {
            logins.add(searchInput.trim().toLowerCase());
        }
        return logins;
    }
    if (command === WRITE_COMMANDS.OPEN_REPORT) {
        const emailList = data?.emailList;
        if (typeof emailList === 'string') {
            for (const login of emailList.split(',')) {
                const normalizedLogin = login.trim().toLowerCase();
                if (normalizedLogin) {
                    logins.add(normalizedLogin);
                }
            }
        }
    }
    return logins;
}

/**
 * When a chat is searched for or started by one of a contact's secondary logins, the server answers with that
 * contact's personal detail keyed by its accountID but with `login` set to the login that was looked up, and the
 * client would otherwise merge it verbatim, replacing the primary login it already has. Everything downstream keys
 * off that single login (the email → personal detail cache, option search terms, chat lookup by participants, the
 * letter-avatar color hash), so the account stops resolving by its primary login and a new optimistic chat is
 * fabricated for a contact the app already knows.
 *
 * This middleware keeps the stored login of an account the client already knows when a lookup response merely
 * echoes the login it was asked for. Only the `login` key is dropped from that entry; the rest of the detail
 * (avatar, display name, search flags, ...) still applies. Genuine login changes never arrive as an echo of the
 * lookup key, and updates that don't go through these commands are not touched.
 */
const PreserveKnownLogin: Middleware = (requestResponse, request) =>
    requestResponse.then((response) => {
        const lookedUpLogins = getLookedUpLogins(request.command, request.data);
        const onyxData = response?.onyxData;
        if (!lookedUpLogins.size || !onyxData?.length) {
            return response;
        }

        for (const update of onyxData) {
            if (update.key !== ONYXKEYS.PERSONAL_DETAILS_LIST || !isRecord(update.value)) {
                continue;
            }
            for (const [accountID, detail] of Object.entries(update.value)) {
                if (!isRecord(detail) || typeof detail.login !== 'string') {
                    continue;
                }
                const incomingLogin = detail.login.trim().toLowerCase();
                if (!lookedUpLogins.has(incomingLogin)) {
                    continue;
                }
                const knownDetail = allPersonalDetails?.[accountID];
                const knownLogin = knownDetail?.login?.trim().toLowerCase();
                if (!knownLogin || knownDetail?.isOptimisticPersonalDetail || knownLogin === incomingLogin) {
                    continue;
                }
                // The server echoed the login we looked the account up by, which is not the login we know this
                // account by: a secondary login. Keep the stored login and apply the rest of the entry as-is.
                const {login, ...detailWithoutLogin} = detail;
                update.value[accountID] = detailWithoutLogin;
            }
        }

        return response;
    });

export default PreserveKnownLogin;

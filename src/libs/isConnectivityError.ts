import CONST from '@src/CONST';

/**
 * A connectivity error is a request failure where the client never received a definitive response from the server:
 * either the request never reached it (`Failed to fetch`) or the backend was unreachable/interrupted
 * (`Expensify service interrupted` — 5xx or auth socket). In these cases the client cannot know whether the server
 * committed the write, so the outcome must be reconciled with the server rather than assumed to have failed.
 *
 * This mirrors the classification already used by `FailureTracking` and `Reauthentication`, kept in one place so the
 * network layer agrees on what "no definitive response arrived" means.
 */
function isConnectivityError(error: {message?: string} | null | undefined): boolean {
    return error?.message === CONST.ERROR.FAILED_TO_FETCH || error?.message === CONST.ERROR.EXPENSIFY_SERVICE_INTERRUPTED;
}

export default isConnectivityError;

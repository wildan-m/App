import {recordFailure, recordSuccess} from '@libs/FailureTracker';
import isConnectivityError from '@libs/isConnectivityError';

import type Middleware from './types';

/**
 * Middleware that observes request outcomes and feeds them to FailureTracker.
 *
 * Any resolved response counts as success — if the server responded at all, the network works.
 * Only genuine connectivity issues count as failures:
 * - FAILED_TO_FETCH → failure (DNS, no internet, network timeout)
 * - EXPENSIFY_SERVICE_INTERRUPTED → failure (server down: 500/502/504/520, auth socket)
 */
const FailureTracking: Middleware = (response) =>
    response
        .then((data) => {
            recordSuccess();
            return data;
        })
        .catch((error: Error) => {
            if (isConnectivityError(error)) {
                recordFailure();
            }

            throw error;
        });

export default FailureTracking;

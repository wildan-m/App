import getPlatform from '@libs/getPlatform';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import debounce from 'lodash/debounce';
import Onyx from 'react-native-onyx';
import Storage from 'react-native-onyx/dist/storage';

import {setSpanAttribute} from './spanAttributes';

/**
 * Measures the size of the local Onyx database and publishes it as the db_size_bytes span
 * attribute. The last measurement is persisted so that on the next app start the value is
 * available immediately — before the first asynchronous measurement completes — which is what
 * lets the startup/TTI span carry it.
 *
 * On native, Storage.getDatabaseSize() reads the SQLite page size and page count, so the value
 * is exact and its cost does not grow with database size. On web, the StorageManager estimate
 * is only reliable on Chromium browsers — detected by the presence of the usageDetails field,
 * which only Chromium populates — so other browsers report an explicit 'unavailable'.
 */

// Whether a fresh measurement has completed this session; once one has, the persisted value
// from the previous session must no longer overwrite it.
let hasMeasuredThisSession = false;

// Only web resolves getPlatform() from the browser bundle; ios/android resolve their own
// platform files. Desktop (Electron) is Chromium, so the usageDetails check passes there.
const isWebStorage = getPlatform() === CONST.PLATFORM.WEB;

// This connection reads the measurement persisted by the previous session so the startup span
// can carry a value before the first async measurement completes. It cannot use useOnyx because
// it runs at module level in the telemetry layer, outside the render tree.
Onyx.connectWithoutView({
    key: ONYXKEYS.LAST_DB_SIZE,
    callback: (value) => {
        if (value === undefined || value === null || hasMeasuredThisSession) {
            return;
        }
        setSpanAttribute(CONST.TELEMETRY.ATTRIBUTE_DB_SIZE_BYTES, value);
    },
});

function measureDatabaseSize() {
    Storage.getDatabaseSize()
        .then(({bytesUsed, usageDetails}) => {
            const isReliable = !isWebStorage || usageDetails !== undefined;
            const dbSize = isReliable ? bytesUsed : CONST.TELEMETRY.DB_SIZE_UNAVAILABLE;
            hasMeasuredThisSession = true;
            setSpanAttribute(CONST.TELEMETRY.ATTRIBUTE_DB_SIZE_BYTES, dbSize);
            Onyx.set(ONYXKEYS.LAST_DB_SIZE, dbSize);
        })
        .catch(() => {
            // Measurement failures are ignored — the last known value (if any) keeps being reported.
        });
}

/**
 * Debounced re-measurement, called from the TelemetrySynchronizer Onyx subscriptions whenever
 * the underlying data changes (report or transaction count changes).
 */
const remeasureDatabaseSize = debounce(measureDatabaseSize, CONST.TELEMETRY.CONFIG.DB_SIZE_REMEASURE_DEBOUNCE_TIME);

/** Takes the initial measurement at app start */
function initializeDatabaseSizeTelemetry() {
    measureDatabaseSize();
}

export {initializeDatabaseSizeTelemetry, remeasureDatabaseSize};

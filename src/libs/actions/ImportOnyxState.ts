import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxCollectionKey, OnyxCollectionValuesMapping, OnyxValues} from '@src/ONYXKEYS';
import type OnyxState from '@src/types/onyx/OnyxState';
import type CollectionDataSet from '@src/types/utils/CollectionDataSet';
import {KEYS_TO_PRESERVE} from './App';

function clearOnyxStateBeforeImport(): Promise<void> {
    return Onyx.clear(KEYS_TO_PRESERVE);
}

/**
 * Set imported collections sequentially with `ONYXKEYS.COLLECTION.REPORT` loaded last.
 *
 * The LHN filter (`shouldDisplayReportInLHN` → `isOneTransactionThread`) implicitly depends on
 * several other collections (`REPORT_ACTIONS`, `TRANSACTION`, `POLICY`, …) being already present
 * when it evaluates a given report. If `REPORT` wins a parallel race with those dependencies the
 * filter sees a stale/empty snapshot and incorrectly keeps transaction-thread reports in the
 * sidebar. Ordering `REPORT` last guarantees every dependency collection has been applied before
 * the sidebar re-renders against imported data.
 */
function importOnyxCollectionState(collectionsMap: Map<keyof OnyxCollectionValuesMapping, CollectionDataSet<OnyxCollectionKey>>): Promise<void> {
    const orderedEntries = Array.from(collectionsMap.entries()).sort(([a], [b]) => {
        if (a === ONYXKEYS.COLLECTION.REPORT) {
            return 1;
        }
        if (b === ONYXKEYS.COLLECTION.REPORT) {
            return -1;
        }
        return 0;
    });

    return orderedEntries.reduce<Promise<void>>((previous, [baseKey, items]) => {
        return previous.then(() => (items ? Onyx.setCollection(baseKey, items) : Promise.resolve()));
    }, Promise.resolve());
}

function importOnyxRegularState(state: OnyxState): Promise<void> {
    if (Object.keys(state).length > 0) {
        return Onyx.multiSet(state as Partial<OnyxValues>);
    }
    return Promise.resolve();
}

export {clearOnyxStateBeforeImport, importOnyxCollectionState, importOnyxRegularState};

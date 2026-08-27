import type {TransactionThreadNavigationDescriptor} from '@libs/TransactionThreadNavigationUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/**
 * When a single transaction report is displayed in RHP it may need extra context in case user navigated to it from MoneyRequestReportView or Reports
 * This context is the list of "sibling" transactions ids.
 * These "siblings" are transactions connected to the same parent Report that the original transaction.
 *
 * We save this value in onyx, so that we can correctly display navigation UI in transaction thread RHP.
 *
 * Optionally a map of transactionID -> sibling descriptor can be provided. It is used by snapshot-backed flows
 * (e.g. the Home "Recently added" section) where the sibling transactions are not guaranteed to live in the
 * main Onyx collections, so the prev/next navigation can't re-derive the thread report from them. When the map
 * is provided, navigation resolves (and lazily creates) each sibling's thread on demand from its descriptor.
 */

let lastSetIDs: string[] | null = null;
let lastSetSnapshotHash: number | null = null;
let lastSetDescriptors: Record<string, TransactionThreadNavigationDescriptor> | null = null;

// The search snapshot hash the Search page last seeded the carousel with. It is kept here rather than in the
// Search component because that component is keyed by the query hash, so it remounts whenever the query changes
// and could not remember what the previous query left behind.
let lastSearchPageSeedHash: number | null = null;

function areDescriptorMapsEqual(a: Record<string, TransactionThreadNavigationDescriptor> | null, b: Record<string, TransactionThreadNavigationDescriptor> | null) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) {
        return false;
    }
    // Compare the identity-bearing fields only; the transaction object is keyed by transactionID, so two
    // descriptors with the same reportID/childReportID/transactionID describe the same sibling.
    return aKeys.every((key) => {
        const next = b[key];
        return (
            !!next &&
            a[key].reportID === next.reportID &&
            a[key].reportAction?.childReportID === next.reportAction?.childReportID &&
            a[key].transaction?.transactionID === next.transaction?.transactionID
        );
    });
}

/**
 * Idempotent: skips the Onyx write when the IDs, snapshot hash, and descriptor map haven't changed.
 * This lets callers (e.g. useEffect in MoneyRequestReportTransactionList) fire
 * freely without worrying about referential equality of the input array.
 */
function setActiveTransactionIDs(ids: string[], snapshotHash?: number, siblingDescriptorsByTransactionID?: Record<string, TransactionThreadNavigationDescriptor>) {
    const nextSnapshotHash = snapshotHash ?? null;
    const nextDescriptors = siblingDescriptorsByTransactionID ?? null;
    const areIDsUnchanged = lastSetIDs?.length === ids.length && lastSetIDs.every((id, i) => id === ids.at(i));
    if (areIDsUnchanged && lastSetSnapshotHash === nextSnapshotHash && areDescriptorMapsEqual(lastSetDescriptors, nextDescriptors)) {
        return Promise.resolve();
    }
    lastSetIDs = ids;
    lastSetSnapshotHash = nextSnapshotHash;
    lastSetDescriptors = nextDescriptors;
    return Promise.all([
        Onyx.set(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_TRANSACTION_IDS, ids),
        Onyx.set(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_SNAPSHOT_HASH, nextSnapshotHash),
        Onyx.set(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_THREAD_REPORT_IDS, nextDescriptors),
    ]);
}

/**
 * Returns the currently active transaction IDs and sibling descriptors. Used by screens that would otherwise
 * take over the carousel context (e.g. a money request report opened on top of an existing transaction thread)
 * so they can detect a snapshot-backed carousel (one with descriptors) and avoid clobbering it.
 */
function getActiveTransactionIDs(): {ids: string[] | null; descriptors: Record<string, TransactionThreadNavigationDescriptor> | null} {
    return {ids: lastSetIDs, descriptors: lastSetDescriptors};
}

function shouldWriteActiveTransactionIDsForSearch(
    activeIDs: string[] | undefined,
    activeSnapshotHash: number | undefined,
    searchSnapshotHash: number,
    searchTransactionIDs: string[],
): boolean {
    if (searchTransactionIDs.length === 0) {
        return false;
    }
    if (!activeIDs?.length) {
        return searchTransactionIDs.length > 1;
    }
    if (activeSnapshotHash !== searchSnapshotHash) {
        return false;
    }
    const isUpToDate = activeIDs.length === searchTransactionIDs.length && activeIDs.every((id, index) => id === searchTransactionIDs.at(index));
    return !isUpToDate;
}

/**
 * Seeds the carousel from the Search page, recording that the page owns it for this search snapshot.
 */
function setActiveTransactionIDsForSearchPage(ids: string[], snapshotHash: number) {
    lastSearchPageSeedHash = snapshotHash;
    return setActiveTransactionIDs(ids, snapshotHash);
}

/**
 * Whether the active carousel is one the Search page seeded for a search it is no longer displaying. Changing the
 * query leaves the seeded IDs behind, and a report opened later can be captured by them, so the page releases them.
 * A carousel another owner has taken over since (an expanded group row, an expense report, the duplicate review)
 * no longer matches the seeded hash, so it is left alone.
 */
function shouldReleaseSearchPageActiveTransactionIDs(searchSnapshotHash: number, activeSnapshotHash: number | undefined): boolean {
    if (lastSearchPageSeedHash === null || lastSearchPageSeedHash === searchSnapshotHash) {
        return false;
    }
    return activeSnapshotHash === lastSearchPageSeedHash;
}

function shouldPreserveActiveTransactionIDs(candidateIDs: string[], anchorTransactionID: string): boolean {
    const activeIDs = lastSetIDs;
    if (!activeIDs?.includes(anchorTransactionID)) {
        return false;
    }
    return activeIDs.length > candidateIDs.length && candidateIDs.every((id) => activeIDs.includes(id));
}

function clearActiveTransactionIDs() {
    lastSetIDs = null;
    lastSetSnapshotHash = null;
    lastSetDescriptors = null;
    lastSearchPageSeedHash = null;
    return Promise.all([
        Onyx.set(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_TRANSACTION_IDS, null),
        Onyx.set(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_SNAPSHOT_HASH, null),
        Onyx.set(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_THREAD_REPORT_IDS, null),
    ]);
}

export {
    setActiveTransactionIDs,
    setActiveTransactionIDsForSearchPage,
    clearActiveTransactionIDs,
    getActiveTransactionIDs,
    shouldWriteActiveTransactionIDsForSearch,
    shouldReleaseSearchPageActiveTransactionIDs,
    shouldPreserveActiveTransactionIDs,
};

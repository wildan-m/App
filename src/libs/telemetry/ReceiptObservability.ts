import {getAll as getAllPersistedRequests, getOngoingRequest} from '@libs/actions/PersistedRequests';
import {WRITE_COMMANDS} from '@libs/API/types';
import getPlatform from '@libs/getPlatform';
import Log from '@libs/Log';
import {getIsOffline} from '@libs/NetworkState';
import {rand64} from '@libs/NumberUtils';

import CONST from '@src/CONST';
import type {AnyRequest} from '@src/types/onyx/Request';
import type {Receipt} from '@src/types/onyx/Transaction';
import type {FileObject} from '@src/types/utils/Attachment';

import type {OnyxEntry} from 'react-native-onyx';

/** Prefix on every receipt log line so we can filter the logs without parsing free text. */
const RECEIPT_LOG_PREFIX = '[Receipt]';

/** Points in the app lifecycle where we snapshot the receipts that are still pending. */
type ReceiptSnapshotTrigger = 'signOut' | 'background' | 'foreground';

/** How a receipt entered the app. */
type ReceiptCaptureSource = 'camera' | 'gallery' | 'file' | 'replace' | 'share';

/**
 * Maps the picker capture path to a source. On native the picker is the OS gallery. On web the same callback fires
 * for both file browsing and drag and drop. Keeping it here means a new platform only has to change one place.
 */
function getPickerCaptureSource(): ReceiptCaptureSource {
    return getPlatform() === CONST.PLATFORM.WEB ? 'file' : 'gallery';
}

/** A receipt that is still sitting in the write queue, so its image has not reached the server yet. */
type PendingQueuedReceipt = {
    /** Local file URI of the receipt image, when the receipt is still backed by a file on this device */
    source: string | undefined;

    /** User visible file name of the receipt */
    fileName: string | undefined;

    /** Transaction the receipt belongs to */
    transactionID: string | undefined;

    /** Correlation id stamped on the file at capture */
    receiptTraceId: string | undefined;

    /** Write command the receipt is queued under */
    command: string;
};

/** Inputs for the enqueued milestone, taken when the receipt request reaches the write queue. */
type ReceiptEnqueuedParams = {
    receiptTraceId: string | undefined;
    transactionID: string | undefined;
    command: string;
    persistedQueueLength: number;
};

/**
 * Write commands whose params carry a captured receipt at data.receipt. A pending request with one of these commands
 * owns a local receipt file that has not reached the server yet. This is the single source of truth shared by the
 * receipt observability logs and the sign-out gallery save, so both features agree on which queued requests own a
 * receipt
 */
const RECEIPT_BEARING_COMMANDS = new Set<string>([
    WRITE_COMMANDS.REQUEST_MONEY,
    WRITE_COMMANDS.TRACK_EXPENSE,
    WRITE_COMMANDS.START_SPLIT_BILL,
    WRITE_COMMANDS.REPLACE_RECEIPT,
    WRITE_COMMANDS.SEND_MONEY_ELSEWHERE,
    WRITE_COMMANDS.SEND_MONEY_WITH_WALLET,
    WRITE_COMMANDS.CATEGORIZE_TRACKED_EXPENSE,
    WRITE_COMMANDS.SHARE_TRACKED_EXPENSE,
    WRITE_COMMANDS.ADD_TRACKED_EXPENSE_TO_POLICY,
]);

/** When each receipt was enqueued, keyed by transaction id, so a snapshot can report how long it has waited. */
const enqueuedAtByTransactionID = new Map<string, number>();

/**
 * Upper bound on the enqueue timing map. The snapshot path normally drains it, but a session that never backgrounds
 * or signs out, like a long-lived web tab, would keep adding one entry per receipt. Once we pass this cap we drop the
 * oldest entry. Losing it only makes a later snapshot miss the wait time for that receipt, so the data stays correct.
 */
const MAX_TRACKED_ENQUEUE_TIMESTAMPS = 100;

/**
 * Creates a unique correlation id for a captured receipt and stamps it on the in-memory file object.
 *
 * We add it as a normal property so it travels with the file through submit into the final request params, and
 * survives JSON.stringify and Onyx storage into the persisted request. This still works for a web File, whose binary
 * content never serializes.
 */
function mintAndStampReceiptTraceId(file: FileObject): string {
    const receiptTraceId = rand64();
    // eslint-disable-next-line no-param-reassign
    file.receiptTraceId = receiptTraceId;
    return receiptTraceId;
}

/**
 * Records the capture milestone, the moment a receipt image enters the app. It carries the entry point, file format,
 * and size, so we can later check whether lost receipts lean toward a format like HEIC or PDF, or toward large files.
 * Sent right away so it survives a hard app kill.
 */
function logReceiptCaptured({file, captureSource, receiptTraceId}: {file: FileObject; captureSource: ReceiptCaptureSource; receiptTraceId: string}) {
    Log.info(`${RECEIPT_LOG_PREFIX} captured`, true, {
        event: 'captured',
        receiptTraceId,
        captureSource,
        mimeType: file.type,
        fileExtension: file.name?.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined,
        fileSizeBytes: file.size ?? undefined,
        platform: getPlatform(),
    });
}

/**
 * Records the submit milestone and maps the draft transaction id to the final one. This is what joins the capture
 * logs to everything downstream, because the id changes from the fixed draft id at submit.
 */
function logReceiptSubmitted({
    receiptTraceId,
    draftTransactionID,
    transactionID,
    command,
    iouType,
}: {
    receiptTraceId: string | undefined;
    draftTransactionID: string;
    transactionID: string;
    command: string;
    iouType: string;
}) {
    Log.info(`${RECEIPT_LOG_PREFIX} submitted`, true, {
        event: 'submitted',
        receiptTraceId,
        draftTransactionID,
        transactionID,
        command,
        iouType,
    });
}

/**
 * Records the enqueued milestone, when the receipt upload reaches the write queue. The gap between this and the
 * existing network "sent" log is the window where the queue is blocked, which is what we want to see. It records the
 * offline state and queue depth so we can tell a normal offline wait apart from a stuck queue.
 */
function logReceiptEnqueued({receiptTraceId, transactionID, command, persistedQueueLength}: ReceiptEnqueuedParams) {
    if (transactionID) {
        // Re-insert so this key becomes the newest, then drop the oldest entries past the cap. This keeps the map
        // bounded even when no snapshot ever runs to drain it.
        enqueuedAtByTransactionID.delete(transactionID);
        enqueuedAtByTransactionID.set(transactionID, Date.now());
        while (enqueuedAtByTransactionID.size > MAX_TRACKED_ENQUEUE_TIMESTAMPS) {
            const oldestTransactionID = enqueuedAtByTransactionID.keys().next().value;
            if (oldestTransactionID === undefined) {
                break;
            }
            enqueuedAtByTransactionID.delete(oldestTransactionID);
        }
    }

    Log.info(`${RECEIPT_LOG_PREFIX} enqueued`, true, {
        event: 'enqueued',
        receiptTraceId,
        transactionID,
        command,
        isOffline: getIsOffline(),
        persistedQueueLength,
    });
}

/**
 * Records the dropped milestone: the receipt file was gone when we built the upload payload, so the request goes out
 * without it. Logged at alert level on the [Receipt] spine so it reaches Sentry and joins the capture, submit, and
 * enqueue lines by receiptTraceId. source and fileName are for the raw device log only; they are not whitelisted, so
 * they never reach Sentry.
 */
function logReceiptDropped({
    receiptTraceId,
    transactionID,
    command,
    source,
    fileName,
}: {
    receiptTraceId: string | undefined;
    transactionID: string | undefined;
    command: string;
    source: string | undefined;
    fileName: string | undefined;
}) {
    Log.alert(`${RECEIPT_LOG_PREFIX} dropped`, {
        event: 'dropped',
        receiptTraceId,
        transactionID,
        command,
        source,
        fileName,
    });
}

/**
 * Whether a single queued request is still holding a captured receipt.
 *
 * SplitBill nests its receipt inside the splits JSON and SendMoney without an attachment has no receipt field, so a
 * receipt-bearing command on its own is not enough: the receipt has to actually be at data.receipt.
 */
function isReceiptBearingRequest(request: OnyxEntry<AnyRequest>): boolean {
    if (!request || !RECEIPT_BEARING_COMMANDS.has(request.command)) {
        return false;
    }

    return !!(request.data as {receipt?: Receipt} | undefined)?.receipt;
}

/**
 * Whether any request in the given slice of the write queue is still holding a captured receipt. Reads straight from
 * Onyx values so a screen can subscribe to it, unlike getPendingQueuedReceipts which reads the in-memory queue.
 */
function hasReceiptBearingRequest(requests: OnyxEntry<AnyRequest[]> | OnyxEntry<AnyRequest>): boolean {
    if (Array.isArray(requests)) {
        return requests.some(isReceiptBearingRequest);
    }

    return isReceiptBearingRequest(requests);
}

/**
 * Walks the write queue and returns every request that still owns a captured receipt. This is the single read that
 * both the queue snapshot log and the sign-out gallery save go through, so the two can never disagree about which
 * queued requests are holding a receipt that has not reached the server yet.
 *
 * Requests are returned in the order they will be sent, so the receipt closest to uploading comes first.
 */
function getPendingQueuedReceipts(): PendingQueuedReceipt[] {
    // Include the ongoing request. Once processNextRequest moves a receipt into the ongoing slot it is the one
    // actively uploading, but it no longer shows up in getAll.
    const ongoingRequest = getOngoingRequest();
    const requests = ongoingRequest ? [ongoingRequest, ...getAllPersistedRequests()] : getAllPersistedRequests();
    const pendingReceipts: PendingQueuedReceipt[] = [];

    for (const request of requests) {
        if (!RECEIPT_BEARING_COMMANDS.has(request.command)) {
            continue;
        }

        const data = (request.data ?? {}) as {transactionID?: string; receipt?: Receipt};
        // Skip when there is no receipt at data.receipt. SplitBill nests it inside the splits JSON, and SendMoney with
        // no attached receipt has no receipt field.
        if (!data.receipt) {
            continue;
        }

        const {source, name, filename, receiptTraceId} = data.receipt;
        pendingReceipts.push({
            // A remote receipt is addressed by a numeric id, and only a local file is at risk of being lost, so
            // anything that is not a string path is reported without a source.
            source: typeof source === 'string' ? source : undefined,
            fileName: name ?? filename,
            transactionID: data.transactionID,
            receiptTraceId,
            command: request.command,
        });
    }

    return pendingReceipts;
}

/**
 * Logs one line per receipt still pending in the write queue, tagged with what triggered the snapshot. Stays quiet
 * when nothing is pending, so the normal case makes no noise. Sent right away so it survives a hard app kill from the
 * background.
 */
function logReceiptQueueSnapshot(trigger: ReceiptSnapshotTrigger) {
    const isOffline = getIsOffline();
    const now = Date.now();
    const pendingTransactionIDs = new Set<string>();

    for (const pendingReceipt of getPendingQueuedReceipts()) {
        const transactionID = pendingReceipt.transactionID;
        if (transactionID) {
            pendingTransactionIDs.add(transactionID);
        }
        const enqueuedAt = transactionID ? enqueuedAtByTransactionID.get(transactionID) : undefined;

        Log.info(`${RECEIPT_LOG_PREFIX} queue snapshot`, true, {
            event: 'snapshot',
            trigger,
            receiptTraceId: pendingReceipt.receiptTraceId,
            transactionID,
            command: pendingReceipt.command,
            msSinceEnqueued: enqueuedAt !== undefined ? now - enqueuedAt : undefined,
            isOffline,
        });
    }

    // Drop timing entries for receipts that already left the queue, so the map only holds pending receipts.
    for (const transactionID of enqueuedAtByTransactionID.keys()) {
        if (pendingTransactionIDs.has(transactionID)) {
            continue;
        }
        enqueuedAtByTransactionID.delete(transactionID);
    }
}

export {
    mintAndStampReceiptTraceId,
    logReceiptCaptured,
    logReceiptSubmitted,
    logReceiptEnqueued,
    logReceiptDropped,
    logReceiptQueueSnapshot,
    getPendingQueuedReceipts,
    hasReceiptBearingRequest,
    getPickerCaptureSource,
    RECEIPT_BEARING_COMMANDS,
};
export type {ReceiptCaptureSource, PendingQueuedReceipt};

import type {PendingQueuedReceipt} from '@libs/telemetry/ReceiptObservability';

type SaveQueuedReceiptsToGallery = (pendingReceipts: PendingQueuedReceipt[]) => Promise<void>;

export default SaveQueuedReceiptsToGallery;

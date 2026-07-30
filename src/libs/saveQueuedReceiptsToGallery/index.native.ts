import fileDownload from '@libs/fileDownload';
import {translateLocal} from '@libs/Localize';
import Log from '@libs/Log';

import type SaveQueuedReceiptsToGallery from './types';

/**
 * Copies every receipt that is still waiting in the write queue into the device gallery.
 *
 * Signing out clears the persisted queue, so a receipt that has not uploaded yet loses the only reference the app
 * had to it. The image itself stays in the durable receipts folder, but that folder is app private, so the user can
 * never reach it. Writing the image to the gallery is what actually hands the receipt back to them.
 *
 * The receipts are saved one at a time so the platform permission prompt and the confirmation alert cannot interleave
 * when more than one receipt is queued. A receipt that fails to save is logged and skipped, because a sign-out must
 * never be blocked by a file we could not copy.
 */
const saveQueuedReceiptsToGallery: SaveQueuedReceiptsToGallery = async (pendingReceipts) => {
    for (const pendingReceipt of pendingReceipts) {
        const {source, fileName, receiptTraceId} = pendingReceipt;

        // Only a local file is at risk here. A receipt already addressed by a remote source is on the server.
        if (!source?.startsWith('file://')) {
            continue;
        }

        try {
            // shouldUnlink is false so we never delete the image out from under a queue entry, and the timestamp is
            // not appended so the receipt keeps the name the user will recognise in their gallery.
            // eslint-disable-next-line no-await-in-loop
            await fileDownload(
                translateLocal,
                source,
                fileName,
                translateLocal('initialSettingsPage.signOutWarningPendingReceipt.savedToGallery'),
                false,
                undefined,
                undefined,
                undefined,
                false,
                false,
            );
        } catch (error) {
            Log.warn('[saveQueuedReceiptsToGallery] Failed to save a pending receipt to the gallery', {
                receiptTraceId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
};

export default saveQueuedReceiptsToGallery;

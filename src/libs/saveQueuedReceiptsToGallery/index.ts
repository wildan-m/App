import type SaveQueuedReceiptsToGallery from './types';

/**
 * Web no-op: a browser has no device gallery, and a queued receipt is held as an in-memory blob URL that the page
 * could not write out on the user's behalf anyway.
 */
const saveQueuedReceiptsToGallery: SaveQueuedReceiptsToGallery = () => Promise.resolve();

export default saveQueuedReceiptsToGallery;

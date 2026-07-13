import type {AnchorPosition} from '@components/TransactionItemRow/types';

import variables from '@styles/variables';

/** Width of the preview, shared with `styles.receiptPreview.width` via `variables.receiptPreviewWidth`. */
const RECEIPT_PREVIEW_WIDTH = variables.receiptPreviewWidth;

/** Horizontal gap between the hovered thumbnail and the preview. */
const RECEIPT_PREVIEW_GAP = 16;

/** Gap kept between the preview and the viewport edges. */
const RECEIPT_PREVIEW_EDGE_MARGIN = 24;

/** Minimum slice of the preview kept on-screen so a row near the bottom doesn't push it fully out of view. */
const RECEIPT_PREVIEW_MIN_VISIBLE_HEIGHT = 160;

/**
 * Anchors the preview's bottom-left corner beside the hovered thumbnail, so the preview grows upward from the row.
 * It sits to the right of the thumbnail unless the caller prefers the left and the preview fits there, and it flips
 * to the left when there isn't room on the right. The top is clamped to a viewport margin so a tall receipt near the
 * top of the screen never runs off the top edge. Returns undefined when there is no anchor, so the caller keeps the
 * static style.
 *
 * @param previewHeight Measured height of the preview. 0 means "not measured yet" — we can't bottom-align without
 * it, so we fall back to aligning the top with the row (keeping a minimum slice on-screen) for the first frame.
 * @param shouldPreferLeft Place the preview to the left of the thumbnail when it fits there, e.g. when an expanded
 * sidebar sits to the left of the row and is the safest thing for the preview to cover. Ignored when the preview
 * would run past the left viewport edge, so preferring the left can never overlap the row it belongs to.
 */
function getAnchoredPreviewPosition(anchorPosition: AnchorPosition | undefined, windowWidth: number, windowHeight: number, previewHeight = 0, shouldPreferLeft = false) {
    if (!anchorPosition) {
        return undefined;
    }

    const rightOfThumbnail = anchorPosition.left + anchorPosition.width + RECEIPT_PREVIEW_GAP;
    const leftOfThumbnail = anchorPosition.left - RECEIPT_PREVIEW_WIDTH - RECEIPT_PREVIEW_GAP;
    const fitsLeft = leftOfThumbnail >= RECEIPT_PREVIEW_EDGE_MARGIN;
    const overflowsRight = windowWidth > 0 && rightOfThumbnail + RECEIPT_PREVIEW_WIDTH + RECEIPT_PREVIEW_EDGE_MARGIN > windowWidth;
    const left = (shouldPreferLeft && fitsLeft) || overflowsRight ? Math.max(RECEIPT_PREVIEW_EDGE_MARGIN, leftOfThumbnail) : rightOfThumbnail;

    // Before it's measured we can't bottom-align, so keep a minimum slice on-screen relative to the row top.
    if (previewHeight <= 0) {
        const lowestTop = windowHeight - RECEIPT_PREVIEW_MIN_VISIBLE_HEIGHT;
        return {left, top: Math.min(Math.max(anchorPosition.top, RECEIPT_PREVIEW_EDGE_MARGIN), Math.max(RECEIPT_PREVIEW_EDGE_MARGIN, lowestTop))};
    }

    // Align the preview's bottom edge with the thumbnail's bottom (bottom-left corner sits at the thumbnail's
    // right side). Cap the thumbnail bottom to the viewport so a row scrolled partially off the bottom doesn't
    // push the preview below the screen, then clamp to the top margin so a tall preview stays on-screen.
    const thumbnailBottom = Math.min(anchorPosition.top + anchorPosition.height, windowHeight - RECEIPT_PREVIEW_EDGE_MARGIN);
    const top = Math.max(RECEIPT_PREVIEW_EDGE_MARGIN, thumbnailBottom - previewHeight);

    return {left, top};
}

export default getAnchoredPreviewPosition;
export {RECEIPT_PREVIEW_WIDTH, RECEIPT_PREVIEW_GAP, RECEIPT_PREVIEW_EDGE_MARGIN, RECEIPT_PREVIEW_MIN_VISIBLE_HEIGHT};

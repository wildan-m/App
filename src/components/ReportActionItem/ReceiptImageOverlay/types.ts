type ReceiptImageOverlayProps = {
    /** Resolved URL of the original (full-resolution) receipt image */
    sourceURL: string;

    /** Whether the source requires an encrypted auth token */
    isAuthTokenRequired?: boolean;

    /** Whether the receipt underneath is rendered at full height, so the overlay derives its aspect ratio the same way */
    shouldUseFullHeight?: boolean;

    /** Whether the receipt underneath is centered in its container (the ThumbnailImage path), so the overlay lines up with it */
    shouldCenterImage?: boolean;
};

export default ReceiptImageOverlayProps;

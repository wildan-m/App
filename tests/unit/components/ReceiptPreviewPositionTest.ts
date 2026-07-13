import getAnchoredPreviewPosition, {
    RECEIPT_PREVIEW_EDGE_MARGIN,
    RECEIPT_PREVIEW_GAP,
    RECEIPT_PREVIEW_MIN_VISIBLE_HEIGHT,
    RECEIPT_PREVIEW_WIDTH,
} from '@components/TransactionItemRow/ReceiptPreview/getAnchoredPreviewPosition';

const WINDOW_WIDTH = 1440;
const WINDOW_HEIGHT = 900;

describe('getAnchoredPreviewPosition', () => {
    it('falls back to the static style (undefined) when there is no anchor', () => {
        expect(getAnchoredPreviewPosition(undefined, WINDOW_WIDTH, WINDOW_HEIGHT)).toBeUndefined();
    });

    it('places the preview just to the right of the hovered thumbnail', () => {
        const anchor = {top: 300, left: 120, width: 68, height: 64};

        const position = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT);

        expect(position?.left).toBe(anchor.left + anchor.width + RECEIPT_PREVIEW_GAP);
    });

    it('aligns the preview top with the hovered row before it has been measured', () => {
        const anchor = {top: 420, left: 120, width: 68, height: 64};

        expect(getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT)?.top).toBe(420);
    });

    it('flips to the left of the thumbnail when there is not enough room on the right', () => {
        // A thumbnail hugging the right edge leaves no room for a 380px-wide preview to its right.
        const anchor = {top: 300, left: WINDOW_WIDTH - 80, width: 68, height: 64};

        const position = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT);

        expect(position?.left).toBe(anchor.left - RECEIPT_PREVIEW_WIDTH - RECEIPT_PREVIEW_GAP);
        expect(position?.left).toBeLessThan(anchor.left);
    });

    it('clamps a row near the top so the preview stays a margin below the viewport top', () => {
        const anchor = {top: 4, left: 120, width: 68, height: 64};

        expect(getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT)?.top).toBe(RECEIPT_PREVIEW_EDGE_MARGIN);
    });

    it('clamps a row near the bottom so the preview keeps a visible slice on-screen before it has been measured', () => {
        const anchor = {top: WINDOW_HEIGHT - 10, left: 120, width: 68, height: 64};

        expect(getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT)?.top).toBe(WINDOW_HEIGHT - RECEIPT_PREVIEW_MIN_VISIBLE_HEIGHT);
    });

    it("aligns a measured preview's bottom-left corner with the right of the thumbnail (grows upward)", () => {
        const previewHeight = 200;
        const anchor = {top: 300, left: 120, width: 68, height: 64};

        const position = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT, previewHeight);
        const thumbnailBottom = anchor.top + anchor.height;

        expect(position?.left).toBe(anchor.left + anchor.width + RECEIPT_PREVIEW_GAP);
        expect(position?.top).toBe(thumbnailBottom - previewHeight);
        // Bottom edge lands on the thumbnail's bottom, so the preview sits above-right of the row.
        expect((position?.top ?? 0) + previewHeight).toBe(thumbnailBottom);
    });

    it('keeps a measured preview on-screen for a row near the bottom by growing upward', () => {
        const previewHeight = 600;
        const anchor = {top: WINDOW_HEIGHT - 200, left: 120, width: 68, height: 64};

        const top = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT, previewHeight)?.top ?? 0;
        const thumbnailBottom = anchor.top + anchor.height;

        expect(top).toBe(thumbnailBottom - previewHeight);
        expect(top).toBeGreaterThanOrEqual(RECEIPT_PREVIEW_EDGE_MARGIN);
        expect(top + previewHeight).toBeLessThanOrEqual(WINDOW_HEIGHT);
    });

    it('caps the preview to the viewport when the hovered row is scrolled partially off the bottom', () => {
        const previewHeight = 200;
        // measureInWindow can report a bottom below the viewport for a row clipped by a scroll container.
        const anchor = {top: WINDOW_HEIGHT - 20, left: 120, width: 68, height: 64};

        const top = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT, previewHeight)?.top ?? 0;

        expect(top).toBe(WINDOW_HEIGHT - RECEIPT_PREVIEW_EDGE_MARGIN - previewHeight);
        expect(top + previewHeight).toBeLessThanOrEqual(WINDOW_HEIGHT);
    });

    it('pins a preview taller than the space above the row to the top margin', () => {
        const previewHeight = WINDOW_HEIGHT + 200;
        const anchor = {top: 500, left: 120, width: 68, height: 64};

        expect(getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT, previewHeight)?.top).toBe(RECEIPT_PREVIEW_EDGE_MARGIN);
    });

    describe('when the caller prefers the left side (expanded sidebar)', () => {
        // The receipt column sits ~456px from the left edge while the Search sidebar is expanded, which leaves
        // room for the preview to open over the sidebar instead of over the row's own data.
        const anchorBesideExpandedSidebar = {top: 300, left: 456, width: 28, height: 32};
        // Collapsing the sidebar pulls the same column left, and the preview no longer fits beside it.
        const anchorBesideCollapsedSidebar = {top: 300, left: 212, width: 28, height: 32};

        it('places the preview to the left of the thumbnail when it fits there', () => {
            const position = getAnchoredPreviewPosition(anchorBesideExpandedSidebar, WINDOW_WIDTH, WINDOW_HEIGHT, 200, true);

            expect(position?.left).toBe(anchorBesideExpandedSidebar.left - RECEIPT_PREVIEW_WIDTH - RECEIPT_PREVIEW_GAP);
            // The preview ends before the thumbnail starts, so it never covers the row it belongs to.
            expect((position?.left ?? 0) + RECEIPT_PREVIEW_WIDTH).toBeLessThanOrEqual(anchorBesideExpandedSidebar.left);
            expect(position?.left).toBeGreaterThanOrEqual(RECEIPT_PREVIEW_EDGE_MARGIN);
        });

        it('falls back to the right of the thumbnail when the left placement would run past the viewport edge', () => {
            const position = getAnchoredPreviewPosition(anchorBesideCollapsedSidebar, WINDOW_WIDTH, WINDOW_HEIGHT, 200, true);

            expect(position?.left).toBe(anchorBesideCollapsedSidebar.left + anchorBesideCollapsedSidebar.width + RECEIPT_PREVIEW_GAP);
        });

        it('keeps opening to the right when the caller does not prefer the left (Home page, collapsed sidebar)', () => {
            const position = getAnchoredPreviewPosition(anchorBesideExpandedSidebar, WINDOW_WIDTH, WINDOW_HEIGHT, 200, false);

            expect(position?.left).toBe(anchorBesideExpandedSidebar.left + anchorBesideExpandedSidebar.width + RECEIPT_PREVIEW_GAP);
        });

        it('still flips left for a thumbnail hugging the right edge, preferred or not', () => {
            const anchor = {top: 300, left: WINDOW_WIDTH - 80, width: 68, height: 64};

            const preferred = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT, 200, true);
            const notPreferred = getAnchoredPreviewPosition(anchor, WINDOW_WIDTH, WINDOW_HEIGHT, 200, false);

            expect(preferred?.left).toBe(anchor.left - RECEIPT_PREVIEW_WIDTH - RECEIPT_PREVIEW_GAP);
            expect(notPreferred?.left).toBe(preferred?.left);
        });

        it('leaves the vertical placement untouched', () => {
            const previewHeight = 200;

            const preferred = getAnchoredPreviewPosition(anchorBesideExpandedSidebar, WINDOW_WIDTH, WINDOW_HEIGHT, previewHeight, true);
            const notPreferred = getAnchoredPreviewPosition(anchorBesideExpandedSidebar, WINDOW_WIDTH, WINDOW_HEIGHT, previewHeight, false);

            expect(preferred?.top).toBe(notPreferred?.top);
        });
    });
});

/**
 * Android has no browser tab title or app icon badge to keep in sync, so there is nothing to compute.
 * The platform split keeps the counting logic and its Onyx subscriptions out of the Android bundle,
 * avoiding a walk over every report on each update only to discard the result.
 */
function UnreadIndicatorUpdater() {
    return null;
}

export default UnreadIndicatorUpdater;

/**
 * Tracks whether an unauthenticated user arrived via the `/concierge` deep link.
 *
 * `openReportFromDeepLink` intentionally drops the pending deep link for a fresh sign-up (see #91437),
 * so the Concierge destination is otherwise lost during onboarding. This lightweight module-level flag
 * bridges that gap: `openReportFromDeepLink` sets it, and `navigateAfterOnboarding` reads it to honor the
 * Concierge chat instead of falling back to HOME. It lives in its own leaf module (rather than inside
 * `actions/Link`) to avoid a circular import — `actions/Link` -> `actions/Report` -> `navigateAfterOnboarding`.
 */
let arrivedFromConciergeDeepLink = false;

function setArrivedFromConciergeDeepLink(value: boolean) {
    arrivedFromConciergeDeepLink = value;
}

function didArriveFromConciergeDeepLink(): boolean {
    return arrivedFromConciergeDeepLink;
}

export {setArrivedFromConciergeDeepLink, didArriveFromConciergeDeepLink};

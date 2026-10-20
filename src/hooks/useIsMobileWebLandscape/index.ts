import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';

/**
 * Whether the app is running on a mobile browser in landscape — the one layout where vertical space is scarce enough
 * that the chrome has to give some of it up. The treatments gated on this flag all switch together with the
 * orientation: on the navigation tab screens the header (TopBar plus any rows below it) scrolls away with the content
 * instead of staying pinned.
 *
 * `isInLandscapeMode` is already false on desktop browsers and tablets (see @libs/isInLandscapeMode), so this is
 * effectively "mobile web phone, in landscape". Native has its own implementation that is always false: it isn't
 * competing with the browser's URL bar for vertical space and keeps its full-size chrome in landscape.
 *
 * This reads `useIsInLandscapeMode` rather than `useResponsiveLayout` on purpose: the flag is consumed by leaf
 * components, and `useResponsiveLayout` additionally subscribes to the modal and navigation contexts, which a
 * boolean gate has no business depending on.
 */
function useIsMobileWebLandscape(): boolean {
    return useIsInLandscapeMode();
}

export default useIsMobileWebLandscape;

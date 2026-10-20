/**
 * The mobile web landscape treatments (scroll-away headers — see the web implementation) never apply on native,
 * which keeps its full-size chrome in landscape.
 */
function useIsMobileWebLandscape(): boolean {
    return false;
}

export default useIsMobileWebLandscape;

import CONST from '@src/CONST';

const SIXTY_DAYS_MS = 60 * CONST.DATE.SECONDS_PER_DAY * CONST.MILLISECONDS_PER_SECOND;

/**
 * Checks if the current date is within 60 days of the date the Discover section first became eligible.
 * Mirrors `isWithinGettingStartedPeriod`. Returns false once the 60-day window has elapsed.
 * Returns true when no anchor date is set yet, so the section shows on first render before the anchor persists.
 */
function isWithinDiscoverPeriod(firstShownDate: string | undefined): boolean {
    if (!firstShownDate) {
        return true;
    }

    const firstShownMs = new Date(firstShownDate).getTime();
    const elapsed = Date.now() - firstShownMs;
    return elapsed >= 0 && elapsed <= SIXTY_DAYS_MS;
}

export default isWithinDiscoverPeriod;

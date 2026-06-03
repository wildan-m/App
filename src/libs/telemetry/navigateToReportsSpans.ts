import type {ValueOf} from 'type-fest';
import getLastRoute from '@components/Navigation/NavigationTabBar/getLastRoute';
import {navigationRef} from '@navigation/Navigation';
import type {SearchFullscreenNavigatorParamList} from '@navigation/types';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import {cancelSpansByPrefix, endSpan, endSpanWithAttributes, getSpan, startSpan} from './activeSpans';

type NavigateToReportsStartType = ValueOf<typeof CONST.TELEMETRY.START_TYPE>;

/**
 * Telemetry for the Reports/Search navigation, split into two spans that share the tab-tap start time:
 * - `ManualNavigateToReportsFirstPaint` ends at the first visible paint (skeleton or, on a cached re-visit, content).
 * - `ManualNavigateToReportsContentLoad` keeps running through any skeleton and ends only at the real content paint.
 *
 * Both spans run alongside the untouched legacy `ManualNavigateToReports` span and are tagged with a shared
 * `start_type` plus search-query descriptors read from the resolved route, so callers pass nothing in.
 */

/** Start both navigation spans at the tab tap (in addition to the legacy span started by the caller). */
function startNavigateToReportsSpans() {
    startSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_FIRST_PAINT, {
        name: CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_FIRST_PAINT,
        op: CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_FIRST_PAINT,
        forceTransaction: true,
    });
    startSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD, {
        name: CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD,
        op: CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD,
        forceTransaction: true,
    });
}

/**
 * Read the active Search route from the navigation state and parse its query into span descriptors.
 * The spans start before navigation, so the route is only resolved by first paint, which is when this runs.
 */
function getSearchRouteDescriptors(): Record<string, string | undefined> {
    if (!navigationRef.isReady()) {
        return {};
    }
    const searchRoute = getLastRoute(navigationRef.getRootState(), NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, SCREENS.SEARCH.ROOT);
    const query = (searchRoute?.params as SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT] | undefined)?.q;
    if (!query) {
        return {};
    }
    const queryJSON = buildSearchQueryJSON(query);
    if (!queryJSON) {
        return {};
    }
    return {
        [CONST.TELEMETRY.ATTRIBUTE_SEARCH_TYPE]: queryJSON.type,
        [CONST.TELEMETRY.ATTRIBUTE_SEARCH_VIEW]: queryJSON.view,
        [CONST.TELEMETRY.ATTRIBUTE_SEARCH_GROUP_BY]: queryJSON.groupBy,
    };
}

/**
 * End the FirstPaint span at a paint site, tagging both spans with the shared `start_type` and search descriptors.
 * The `start_type` is determined by which paint site closes FirstPaint:
 * cold data-loading skeleton ⇒ `cold`, deferred-mount skeleton ⇒ `warm_first`, direct content/re-focus ⇒ `warm_subsequent`.
 */
function endNavigateToReportsFirstPaint(startType: NavigateToReportsStartType) {
    const attributes = {
        [CONST.TELEMETRY.ATTRIBUTE_START_TYPE]: startType,
        ...getSearchRouteDescriptors(),
    };
    // Copy the shared attributes onto the still-running ContentLoad span so both spans carry the same start_type/descriptors.
    getSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD)?.setAttributes(attributes);
    endSpanWithAttributes(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_FIRST_PAINT, attributes);
}

/** End the ContentLoad span at the real content paint. */
function endNavigateToReportsContentLoad() {
    // Cached re-visit: content paints directly with no skeleton, so FirstPaint is still open. Close it as warm_subsequent first.
    if (getSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_FIRST_PAINT)) {
        endNavigateToReportsFirstPaint(CONST.TELEMETRY.START_TYPE.WARM_SUBSEQUENT);
    }
    endSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD);
}

/**
 * Cancel both new spans (and the legacy span) when navigation is abandoned. Both new span names share the
 * `ManualNavigateToReports` prefix, so a single prefix cancel tears down all three.
 */
function cancelNavigateToReportsSpans() {
    cancelSpansByPrefix(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS);
}

export {startNavigateToReportsSpans, endNavigateToReportsFirstPaint, endNavigateToReportsContentLoad, cancelNavigateToReportsSpans};

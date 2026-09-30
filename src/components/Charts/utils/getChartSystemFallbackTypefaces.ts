import type {ChartDefaultTypeface} from '@components/Charts/types/chartSkiaTypefaceTypes';

/**
 * CanvasKit on web ships without system fonts, so there is nothing to fall back to.
 */
function getChartSystemFallbackTypefaces(): ChartDefaultTypeface | null {
    return null;
}

export default getChartSystemFallbackTypefaces;

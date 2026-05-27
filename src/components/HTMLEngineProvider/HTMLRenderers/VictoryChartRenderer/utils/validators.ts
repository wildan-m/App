import type {RawChartData, RawLegendData} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/types';

/**
 * Runtime type guards used to keep Victory chart parsing strict.
 * `parseAttribute` returns whatever JSON5 produced (or the raw string on failure), so the per-tag
 * parsers must validate the shape at runtime before iterating/mapping over it — otherwise malformed
 * HTML attributes throw a `TypeError` and crash the surrounding chat/HTML render.
 */

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every(isNumber);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** A `<victorybar>` / `<victoryline>` data point: `{x: string | number, y: number}`. */
function isRawChartData(value: unknown): value is RawChartData {
    return isObject(value) && (typeof value.x === 'string' || typeof value.x === 'number') && isNumber(value.y);
}

/** A `<victorylegend>` entry: an object with a string `name`. */
function isRawLegendDataEntry(value: unknown): value is RawLegendData {
    return isObject(value) && typeof value.name === 'string';
}

export {isObject, isNumber, isNumberArray, isStringArray, isRawChartData, isRawLegendDataEntry};

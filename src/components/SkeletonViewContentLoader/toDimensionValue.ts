import type {DimensionValue} from 'react-native';

/** Converts an SVG-style dimension (number, numeric string or percentage string) to a React Native dimension */
function toDimensionValue(value: number | string | undefined): DimensionValue | undefined {
    if (value === undefined || typeof value === 'number') {
        return value;
    }
    const num = Number(value);
    return Number.isNaN(num) ? (value as DimensionValue) : num;
}

export default toDimensionValue;

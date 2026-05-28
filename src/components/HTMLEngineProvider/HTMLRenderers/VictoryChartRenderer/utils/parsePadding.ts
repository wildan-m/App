import lodashIsObject from 'lodash/isObject';
import type {CartesianChartProps} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/types';
import parseAttribute from './parseAttribute';

type Padding = CartesianChartProps['padding'];

// VictoryChart (web) applies 50 on every side when `padding` is not set.
// victory-native resolves missing sides to 0, so unspecified sides need to be
// filled in here to keep the two layouts aligned with the source `<victorylegend>`
// coordinates baked against a 50px-padded layout.
const VICTORY_CHART_DEFAULT_PADDING = 50;

/**
 * Translate VictoryChart's `padding` attribute into victory-native's `padding` shape.
 */
function parsePadding(attribute: string): Padding {
    const padding = parseAttribute(attribute);
    if (typeof padding === 'number') {
        return padding;
    }
    if (lodashIsObject(padding)) {
        const pickSide = (side: 'left' | 'right' | 'top' | 'bottom'): number => {
            const value = (padding as Record<string, unknown>)[side];
            return typeof value === 'number' ? value : VICTORY_CHART_DEFAULT_PADDING;
        };
        return {
            left: pickSide('left'),
            right: pickSide('right'),
            top: pickSide('top'),
            bottom: pickSide('bottom'),
        };
    }
    return VICTORY_CHART_DEFAULT_PADDING;
}

export default parsePadding;

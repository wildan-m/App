import type {TNode} from 'react-native-render-html';
import {X_KEY} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/constants';
import type {CartesianChartData, PartialProcessNodeResult, RawChartData} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/types';
import getYKey from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/getYKey';
import parseAttribute from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/parseAttribute';
import {isRawChartData} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/validators';

/**
 * Parse data points from a `<victorybar>` or `<victoryline>` node.
 * Both series types share the same data structure: an array of {x, y} points.
 */
function parseVictorySeriesNode(tnode: TNode): PartialProcessNodeResult {
    const parsed = parseAttribute(tnode.attributes.data);
    // Only iterate when `data` is an array, and drop any malformed point so bad input degrades to an empty series instead of throwing.
    const points: RawChartData[] = Array.isArray(parsed) ? parsed.filter(isRawChartData) : [];
    const yKey = getYKey(tnode);
    const data: Record<string, CartesianChartData> = {};
    for (const point of points) {
        data[point.x] = {
            [X_KEY]: point.x,
            [yKey]: point.y,
        } as CartesianChartData;
    }
    return {data, yKeys: [yKey]};
}

export default parseVictorySeriesNode;

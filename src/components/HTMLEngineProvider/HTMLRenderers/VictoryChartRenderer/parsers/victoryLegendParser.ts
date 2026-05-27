import type {TNode} from 'react-native-render-html';
import type {LegendItem, LegendItemEntry, PartialProcessNodeResult, RawLegendStyle} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/types';
import parseAttribute from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/parseAttribute';
import {isRawLegendDataEntry} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/validators';

/**
 * Parse legend config from a `<victorylegend>` node.
 */
function parseVictoryLegendNode(tnode: TNode): PartialProcessNodeResult {
    const x = parseAttribute<number>(tnode.attributes.x) ?? 0;
    const y = parseAttribute<number>(tnode.attributes.y) ?? 0;
    const gutter = parseAttribute<number>(tnode.attributes.gutter) ?? undefined;
    const symbolSpacer = parseAttribute<number>(tnode.attributes.symbolspacer) ?? undefined;
    const style = parseAttribute<RawLegendStyle>(tnode.attributes.style);
    const color = style?.labels?.fill;
    const fontSize = style?.labels?.fontSize !== undefined ? Number(style.labels.fontSize) : undefined;
    const fontWeight = Number(style?.labels?.fontWeight) === 700 ? 'bold' : undefined;
    const parsedData = parseAttribute(tnode.attributes.data);
    // Only map when `data` is an array, and drop any entry without a string `name` so malformed legend input is ignored instead of throwing.
    const rawEntries = Array.isArray(parsedData) ? parsedData.filter(isRawLegendDataEntry) : [];
    const entries: LegendItemEntry[] = rawEntries.map((entry) => {
        const text = entry.name;
        const symbolColor = entry.symbol?.fill;
        const symbolSize = entry.symbol?.size !== undefined ? Number(entry.symbol.size) : undefined;
        return {text, color, fontSize, fontWeight, symbolColor, symbolSize};
    });
    const legendItem: LegendItem = {x, y, entries, gutter, symbolSpacer};
    return {legendItems: [legendItem]};
}

export default parseVictoryLegendNode;

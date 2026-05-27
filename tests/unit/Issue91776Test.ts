import type {TNode} from 'react-native-render-html';
import type {PartialProcessNodeResult} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/types';
import parseVictoryLabelNode from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/parsers/victoryLabelParser';
import parseVictoryLegendNode from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/parsers/victoryLegendParser';
import parseVictorySeriesNode from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/parsers/victorySeriesParser';
import parseAttribute from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/parseAttribute';
import {isNumber, isNumberArray, isRawChartData, isRawLegendDataEntry, isStringArray} from '@components/HTMLEngineProvider/HTMLRenderers/VictoryChartRenderer/utils/validators';

/**
 * Regression coverage for harden-Victory-chart-parsers (Issue #91776).
 * Malformed HTML attributes must never throw out of the per-tag parsers — they should degrade to an
 * empty/default result so the provider can fail closed (render nothing) instead of crashing the chat view.
 */

/** Build a minimal TNode stand-in carrying the given attributes. */
function makeNode(attributes: Record<string, string>): TNode {
    return {attributes, nodeIndex: 0, parent: null} as unknown as TNode;
}

describe('parseAttribute runtime validation', () => {
    it('returns undefined when the parsed value fails the supplied guard', () => {
        expect(parseAttribute('42', isNumberArray)).toBeUndefined();
        expect(parseAttribute('{x: 1}', isNumberArray)).toBeUndefined();
        expect(parseAttribute('not-json', isNumberArray)).toBeUndefined();
        expect(parseAttribute('["a", 2]', isStringArray)).toBeUndefined();
        expect(parseAttribute('abc', isNumber)).toBeUndefined();
    });

    it('returns the value when it satisfies the guard', () => {
        expect(parseAttribute('[1, 2, 3]', isNumberArray)).toEqual([1, 2, 3]);
        expect(parseAttribute('["a", "b"]', isStringArray)).toEqual(['a', 'b']);
        expect(parseAttribute('20', isNumber)).toBe(20);
    });

    it('stays backward compatible without a guard', () => {
        expect(parseAttribute('20')).toBe(20);
        expect(parseAttribute('Green')).toBe('Green');
        expect(parseAttribute('')).toBeUndefined();
    });
});

describe('parseVictorySeriesNode hardening', () => {
    it.each([
        ['a number', '42'],
        ['an object', '{x: 1, y: 2}'],
        ['a bare string', 'totally not json'],
        ['null', 'null'],
    ])('does not throw and yields no points when data is %s', (_label, data) => {
        let result: PartialProcessNodeResult | undefined;
        expect(() => {
            result = parseVictorySeriesNode(makeNode({data}));
        }).not.toThrow();
        expect(result?.data).toEqual({});
    });

    it('drops malformed points but keeps the valid ones', () => {
        const result = parseVictorySeriesNode(makeNode({data: "[{x: 'Jan', y: 3}, null, {x: 'Feb'}, 5, {x: 'Mar', y: 7}]"}));
        // Only the two complete {x, y} points survive.
        expect(Object.keys(result.data ?? {})).toEqual(['Jan', 'Mar']);
    });

    it('still parses fully valid data', () => {
        const result = parseVictorySeriesNode(makeNode({data: "[{x: 'Jan', y: 3}, {x: 'Feb', y: 4}]"}));
        expect(Object.keys(result.data ?? {})).toEqual(['Jan', 'Feb']);
    });
});

describe('parseVictoryLegendNode hardening', () => {
    it.each([
        ['a number', '7'],
        ['an object', '{name: "A"}'],
        ['array with null/invalid entries', '[null, 5, {nope: true}]'],
    ])('does not throw and yields no entries when data is %s', (_label, data) => {
        let result: PartialProcessNodeResult | undefined;
        expect(() => {
            result = parseVictoryLegendNode(makeNode({data}));
        }).not.toThrow();
        expect(result?.legendItems?.[0]?.entries).toEqual([]);
    });

    it('keeps only well-formed entries', () => {
        const result = parseVictoryLegendNode(makeNode({data: '[{name: "A"}, null, {name: "B"}]'}));
        expect(result.legendItems?.[0]?.entries.map((entry) => entry.text)).toEqual(['A', 'B']);
    });
});

describe('parseVictoryLabelNode hardening', () => {
    it('falls back to 0 for non-numeric coordinates instead of passing through a string', () => {
        const result = parseVictoryLabelNode(makeNode({x: 'abc', y: '{}', text: 'Hi'}));
        expect(result.labelItems?.[0]).toMatchObject({x: 0, y: 0, text: 'Hi'});
    });

    it('keeps valid numeric coordinates', () => {
        const result = parseVictoryLabelNode(makeNode({x: '10', y: '20', text: 'Hi'}));
        expect(result.labelItems?.[0]).toMatchObject({x: 10, y: 20});
    });
});

describe('shape guards', () => {
    it('isRawChartData accepts {x, y} and rejects everything else', () => {
        expect(isRawChartData({x: 'Jan', y: 3})).toBe(true);
        expect(isRawChartData({x: 1, y: 3})).toBe(true);
        expect(isRawChartData({x: 'Jan'})).toBe(false);
        expect(isRawChartData(null)).toBe(false);
        expect(isRawChartData(5)).toBe(false);
        expect(isRawChartData({x: {}, y: 3})).toBe(false);
    });

    it('isRawLegendDataEntry requires a string name', () => {
        expect(isRawLegendDataEntry({name: 'A'})).toBe(true);
        expect(isRawLegendDataEntry({name: 1})).toBe(false);
        expect(isRawLegendDataEntry(null)).toBe(false);
    });
});

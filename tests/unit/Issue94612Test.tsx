import {render} from '@testing-library/react-native';
import React from 'react';
import {View} from 'react-native';
import ComposeProviders from '@components/ComposeProviders';
import HTMLEngineProvider from '@components/HTMLEngineProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import RenderHTML from '@components/RenderHTML';

/**
 * Regression test for https://github.com/Expensify/App/issues/94612 — "Add native support for HTML tables in responses".
 *
 * react-native-render-html already lays out the table structure (each `<tr>` is a flex row, each `<td>`/`<th>` a flex
 * cell), but the App registered no `tagStyles` for the table tags, so tables rendered with no borders, padding or header
 * emphasis — appearing as raw, unformatted rows of text (the broken rendering reported in the issue). The fix adds
 * `tagStyles` for `table`/`tr`/`th`/`td`/`caption` so tabular content renders as a clean, readable table.
 *
 * This test renders the real RenderHTML pipeline and asserts the table cells receive the grid styling. It fails on the
 * pre-fix code because no border styles are applied to the cells.
 */

const TABLE_HTML = '<table><thead><tr><th>Vendor</th><th>Amount</th></tr></thead><tbody><tr><td>Amazon</td><td>$88</td></tr><tr><td>PayPal</td><td>$50</td></tr></tbody></table>';

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object';
}

function flattenStyle(style: unknown, acc: Record<string, unknown>) {
    if (Array.isArray(style)) {
        for (const entry of style) {
            flattenStyle(entry, acc);
        }
        return;
    }
    if (isRecord(style)) {
        Object.assign(acc, style);
    }
}

function walk(node: unknown, visit: (style: Record<string, unknown>) => void) {
    if (!isRecord(node)) {
        return;
    }
    const style: Record<string, unknown> = {};
    const props = isRecord(node.props) ? node.props : undefined;
    flattenStyle(props?.style, style);
    visit(style);
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            walk(child, visit);
        }
    }
}

function renderTable(): unknown {
    const {toJSON} = render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, HTMLEngineProvider]}>
            <View>
                <RenderHTML html={TABLE_HTML} />
            </View>
        </ComposeProviders>,
    );
    return toJSON();
}

describe('Issue 94612 - native HTML table rendering', () => {
    it('lays out rows horizontally and renders the cell text', () => {
        const tree = renderTable();
        let rowCount = 0;
        let flexCellCount = 0;
        walk(tree, (style) => {
            if (style.flexDirection === 'row') {
                rowCount += 1;
            }
            if (style.flex === 1) {
                flexCellCount += 1;
            }
        });

        // Three rows (header + two body rows) lay out horizontally, each with flex cells.
        expect(rowCount).toBeGreaterThanOrEqual(3);
        expect(flexCellCount).toBeGreaterThanOrEqual(6);

        const serialized = JSON.stringify(tree);
        expect(serialized).toContain('Vendor');
        expect(serialized).toContain('Amazon');
        expect(serialized).toContain('PayPal');
    });

    it('applies grid styling (borders + padding) to the table cells', () => {
        const tree = renderTable();
        let borderedCellCount = 0;
        let paddedCellCount = 0;
        walk(tree, (style) => {
            if (style.borderRightWidth === 1 && style.borderBottomWidth === 1) {
                borderedCellCount += 1;
            }
            if (style.paddingTop === 6 && style.paddingLeft === 8) {
                paddedCellCount += 1;
            }
        });

        // The fix gives every cell (4 body + 2 header) a border and padding; this is what's missing on main.
        expect(borderedCellCount).toBeGreaterThanOrEqual(6);
        expect(paddedCellCount).toBeGreaterThanOrEqual(6);
    });
});

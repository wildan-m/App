import {processBeforeSendSpan} from '@libs/telemetry/middlewares';
import inpCategory, {getINPCategory, getSentryLabel} from '@libs/telemetry/middlewares/inpCategory';

import CONST from '@src/CONST';

import type {SpanJSON} from '@sentry/core';

function buildSpan(op: string | undefined, description: string | undefined, data: SpanJSON['data'] = {}): SpanJSON {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Sentry protocol field names
    return {span_id: 'a', trace_id: 'b', start_timestamp: 0, timestamp: 1, op, description, data};
}

describe('inpCategory', () => {
    it('sets inp.category to <Area>-<Action> for an INP span whose label has three parts', () => {
        // Given an INP span on a pressable labelled with the <Area>-<Action>-<Detail> schema
        const span = buildSpan('ui.interaction.click', '[data-sentry-label="Search-ActionCellAction-Submit"]');

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then the category drops the detail part, so all actions of the cell aggregate together on the dashboard
        expect(result.data[CONST.TELEMETRY.ATTRIBUTE_INP_CATEGORY]).toBe('Search-ActionCellAction');
    });

    it('reads the label out of a CSS selector instead of splitting the raw description', () => {
        // Given an INP span whose description is a labelled ancestor followed by the CSS path of the clicked child
        const span = buildSpan('ui.interaction.click', '[data-sentry-label="SelectionList-ListHeader-SelectAll"] div.css-146c3p1.r-1udh08x > svg');

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then only the label is used, so the CSS classes do not leak into the category
        expect(result.data[CONST.TELEMETRY.ATTRIBUTE_INP_CATEGORY]).toBe('SelectionList-ListHeader');
    });

    it('uses the label closest to the interacted element when the selector holds several labels', () => {
        // Given a selector that lists a labelled section first and the labelled row inside it last
        const span = buildSpan('ui.interaction.click', '[data-sentry-label="Settings-Section-Profile"] > [data-sentry-label="Settings-MenuItem-Avatar"] > div');

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then the innermost label wins, because Sentry builds the selector from the outermost ancestor down
        expect(result.data[CONST.TELEMETRY.ATTRIBUTE_INP_CATEGORY]).toBe('Settings-MenuItem');
    });

    it('keeps the existing span data when it adds the category', () => {
        // Given an INP span that already carries other attributes
        const span = buildSpan('ui.interaction.press', '[data-sentry-label="Home-CreateExpense-Distance"]', {reportsCount: 42});

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then the category is added next to the existing attributes
        expect(result.data).toEqual({reportsCount: 42, [CONST.TELEMETRY.ATTRIBUTE_INP_CATEGORY]: 'Home-CreateExpense'});
    });

    it('returns the span untouched when the label has only two parts', () => {
        // Given an INP span labelled with an older <Area>-<Action> label
        const span = buildSpan('ui.interaction.click', '[data-sentry-label="MoreMenu-ExportFile"]');

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then no category is set, so the dashboard filter `has:inp.category` leaves it out
        expect(result).toBe(span);
    });

    it('returns the span untouched when the description has no label', () => {
        // Given an INP span on an element without data-sentry-label
        const span = buildSpan('ui.interaction.click', 'body > div#root > div.css-175oi2r');

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then nothing is added
        expect(result).toBe(span);
    });

    it('ignores spans that are not INP spans', () => {
        // Given a non-INP span whose description happens to contain a three-part label
        const span = buildSpan('ui.webvital.lcp', '[data-sentry-label="Search-ActionCellAction-Submit"]');

        // When the span goes through the middleware
        const result = inpCategory(span);

        // Then it is left alone, because only interaction spans feed the INP dashboard
        expect(result).toBe(span);
    });

    it('runs as part of the beforeSendSpan pipeline', () => {
        // Given an INP span with a categorized label
        const span = buildSpan('ui.interaction.click', '[data-sentry-label="Search-ActionCellAction-Pay"]');

        // When it goes through the pipeline wired into Sentry.init as beforeSendSpan
        const result = processBeforeSendSpan(span);

        // Then the category is set
        expect(result.data[CONST.TELEMETRY.ATTRIBUTE_INP_CATEGORY]).toBe('Search-ActionCellAction');
    });
});

describe('getSentryLabel', () => {
    it('returns undefined for an empty description', () => {
        // Given spans without a description, which Sentry allows
        // When the label is read
        // Then there is no label
        expect(getSentryLabel(undefined)).toBeUndefined();
        expect(getSentryLabel('')).toBeUndefined();
    });
});

describe('getINPCategory', () => {
    it('uses the first two parts for labels with more than three parts', () => {
        // Given a label whose detail is itself split into several parts
        // When the category is derived
        // Then it is still <Area>-<Action>
        expect(getINPCategory('WorkspaceRules-NewRuleMenuItem-Restrict-CardSpend')).toBe('WorkspaceRules-NewRuleMenuItem');
    });

    it('returns undefined for a label with an empty part', () => {
        // Given a malformed label with a doubled separator
        // When the category is derived
        // Then no category is produced rather than one with an empty part
        expect(getINPCategory('Search--Submit')).toBeUndefined();
    });
});

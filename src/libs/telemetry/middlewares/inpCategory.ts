import CONST from '@src/CONST';

import type {TelemetryBeforeSendSpan} from './index';

const INP_SPAN_OP_PREFIX = 'ui.interaction.';

/** Matches every `[data-sentry-label="..."]` part of the CSS selector Sentry uses as the INP span description. */
const SENTRY_LABEL_REGEX = /\[data-sentry-label="([^"]+)"\]/g;

/** Labels follow `<Area>-<Action>-<Detail>`, so a label needs at least three parts to belong to a category. */
const MIN_CATEGORIZED_LABEL_PARTS = 3;

/**
 * Returns the label closest to the interacted element. When several labelled ancestors fit in the selector, they are
 * listed from the outermost to the innermost, so the last one is the label of the element the user interacted with.
 */
function getSentryLabel(description: string | undefined): string | undefined {
    if (!description) {
        return undefined;
    }
    return Array.from(description.matchAll(SENTRY_LABEL_REGEX)).at(-1)?.at(1);
}

/** Derives `<Area>-<Action>` from a `<Area>-<Action>-<Detail>` label. Labels with fewer parts have no category. */
function getINPCategory(label: string): string | undefined {
    const parts = label.split('-');
    if (parts.length < MIN_CATEGORIZED_LABEL_PARTS || parts.some((part) => !part)) {
        return undefined;
    }
    return `${parts.at(0)}-${parts.at(1)}`;
}

/**
 * Adds the `inp.category` attribute to INP spans, so the Sentry INP dashboard can aggregate INP per interaction group.
 */
const inpCategory: TelemetryBeforeSendSpan = (span) => {
    if (!span.op?.startsWith(INP_SPAN_OP_PREFIX)) {
        return span;
    }

    const label = getSentryLabel(span.description);
    const category = label ? getINPCategory(label) : undefined;
    if (!category) {
        return span;
    }

    return {...span, data: {...span.data, [CONST.TELEMETRY.ATTRIBUTE_INP_CATEGORY]: category}};
};

export {getSentryLabel, getINPCategory};
export default inpCategory;

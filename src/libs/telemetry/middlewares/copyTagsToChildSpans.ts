import CONST from '@src/CONST';

import type {TelemetryBeforeSend} from './index';

import {getSpanAttributes} from '../spanAttributes';

/**
 * List of tags that should be copied from the transaction to all child spans
 */
const TAGS_TO_COPY = Object.values(CONST.TELEMETRY.TAGS);

/**
 * Middleware that copies specific tags from the transaction event to all child spans, and stamps
 * the account-size numeric attributes (raw entity counts, database size) on the transaction and
 * all child spans. This ensures that child spans inherit important context from the parent
 * transaction, and that every span can be range-filtered and aggregated by account size in Sentry.
 */
const copyTagsToChildSpans: TelemetryBeforeSend = (event) => {
    const spanAttributes = getSpanAttributes();
    const hasSpanAttributes = Object.keys(spanAttributes).length > 0;

    // The transaction's own attributes live in its trace context, not in the spans list.
    const contexts =
        hasSpanAttributes && event.contexts?.trace
            ? {
                  ...event.contexts,
                  trace: {
                      ...event.contexts.trace,
                      data: {...event.contexts.trace.data, ...spanAttributes},
                  },
              }
            : event.contexts;

    if (!event.spans || event.spans.length === 0) {
        return {...event, contexts};
    }

    if (!event.tags && !hasSpanAttributes) {
        return {...event, contexts};
    }

    const spans = event.spans.map((span) => {
        const updatedTags: Record<string, unknown> = {};

        for (const tagKey of TAGS_TO_COPY) {
            const tagValue = event.tags?.[tagKey];
            if (tagValue !== undefined) {
                updatedTags[tagKey] = tagValue;
            }
        }

        return {
            ...span,
            ...(event.tags ? {tags: updatedTags} : {}),
            ...(hasSpanAttributes ? {data: {...span.data, ...spanAttributes}} : {}),
        };
    });

    return {...event, contexts, spans};
};

export default copyTagsToChildSpans;

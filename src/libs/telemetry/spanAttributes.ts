/**
 * Module-level store of account-size attributes (raw entity counts, database size) that the
 * copyTagsToChildSpans middleware stamps on every outgoing transaction and child span.
 *
 * This lives in its own side-effect-free module so that the middleware (loaded during Sentry
 * setup) can read the values without importing TelemetrySynchronizer, whose module-level Onyx
 * connections must not be pulled forward in the app's initialization order.
 */
const spanAttributes: Record<string, number | string> = {};

function setSpanAttribute(name: string, value: number | string) {
    spanAttributes[name] = value;
}

function getSpanAttributes(): Record<string, number | string> {
    return spanAttributes;
}

export {setSpanAttribute, getSpanAttributes};

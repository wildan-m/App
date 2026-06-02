/**
 * Use Nitro's fetch implementation for every bare `fetch(...)` on native.
 * On web, NitroFetch still uses the vanilla global fetch implementation.
 */
import {fetch as nitroFetch, Headers as NitroHeaders, Request as NitroRequest, Response as NitroResponse} from 'react-native-nitro-fetch';

// Nitro's fetch is backed by a native HTTP client (Cronet on Android / URLSession on iOS) and only
// handles network (http/https) requests. Reads of local resources through `fetch()` — `file://`,
// `content://`, `blob:` and `data:` URIs used by flows such as CSV/spreadsheet import and attachment
// processing — must keep using React Native's built-in fetch, which supports those schemes. Capture
// the built-in fetch before overriding so we can delegate non-network requests back to it.
const reactNativeFetch = globalThis.fetch;

const getRequestUrl = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input.href;
    }
    return input?.url ?? '';
};

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = getRequestUrl(input);
    // Only route real network requests through Nitro; local-resource schemes go to the built-in fetch.
    if (url && !/^https?:/i.test(url)) {
        return reactNativeFetch(input, init);
    }
    return nitroFetch(input, init);
}) as typeof fetch;
globalThis.Headers = NitroHeaders;
globalThis.Request = NitroRequest;
globalThis.Response = NitroResponse;

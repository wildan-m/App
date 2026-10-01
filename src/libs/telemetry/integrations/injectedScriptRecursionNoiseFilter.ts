import type {Event, Integration, StackFrame} from '@sentry/core';

import {ANONYMOUS_FILENAMES, THIRD_PARTY_CODE_TAG} from './classCallCheckNoiseFilter';

/** The `RangeError` message V8 and JavaScriptCore throw on stack overflow. JavaScriptCore appends a period. */
const STACK_OVERFLOW_MESSAGES = new Set(['Maximum call stack size exceeded', 'Maximum call stack size exceeded.']);

/** Prefix `createReactNativeRewriteFrames` gives every rewritten frame filename. */
const REWRITTEN_FRAME_PREFIX = 'app:///';

/**
 * True when the frame has no script URL of its own.
 *
 * Browsers name an inline script (one injected at runtime with no `src`) after the document URL, and the frame
 * rewrite keeps only its last path segment - so `https://new.expensify.com/home` arrives as `app:///home`, and
 * `/onboarding/work-email` as `app:///work-email`. A real script file keeps its extension through the rewrite:
 * our chunks are always `[name]-[contenthash].bundle.js` (`config/rsbuild/rsbuild.common.ts`), and a named
 * third-party script is `*.js` too. The query string and fragment are ignored, since a document URL may carry
 * either and they can contain dots.
 */
function isScriptlessFrame(frame: StackFrame): boolean {
    const filename = frame.filename ?? '';
    if (ANONYMOUS_FILENAMES.has(filename)) {
        return true;
    }
    if (!filename.startsWith(REWRITTEN_FRAME_PREFIX)) {
        return false;
    }

    const basename = filename.slice(REWRITTEN_FRAME_PREFIX.length).split(/[?#]/).at(0) ?? '';
    return !basename.includes('/') && !basename.includes('.');
}

/**
 * True for the injected-script stack overflow tracked in https://github.com/Expensify/App/issues/102044
 * (Sentry APP-M6P and its 10 siblings): two minified functions recursing at `app:///home:226`.
 *
 * Three conditions must hold together, and App code cannot satisfy all three:
 *
 * 1. `thirdPartyErrorFilterIntegration` found no frame carrying our bundle key. For a stack overflow the captured
 *    frames are the recursion loop itself, so a loop in App code - or in any library we bundle - would be stamped.
 *    Requiring the tag also proves the build was stamped, and keeps this filter inert where that integration is
 *    not installed.
 * 2. Every exception value is the stack-overflow `RangeError`.
 * 3. Every frame has no script URL of its own (see `isScriptlessFrame`). App code only ships in named hashed
 *    chunks, so it cannot produce a frame named after a route.
 *
 * Sentry split this one crash into 11 issues because the frame filename follows whatever route the user was on;
 * matching on scriptless frames rather than a fixed route name covers all of them.
 *
 * Deliberately narrow, like `classCallCheckNoiseFilter`: a named third-party script that recurses is kept, since
 * it is something we may still act on.
 */
function isInjectedScriptRecursionNoise(event: Event): boolean {
    if (event.tags?.[THIRD_PARTY_CODE_TAG] !== true) {
        return false;
    }

    const values = event.exception?.values ?? [];
    const isSignature = values.length > 0 && values.every((value) => value.type === 'RangeError' && STACK_OVERFLOW_MESSAGES.has(value.value ?? ''));
    if (!isSignature) {
        return false;
    }

    const frames = values.flatMap((value) => value.stacktrace?.frames ?? []);
    return frames.length > 0 && frames.every(isScriptlessFrame);
}

/**
 * Drops the GH #102044 noise with an event processor, for the same reasons and with the same ordering
 * requirement as `classCallCheckNoiseFilterIntegration`: it reads the tag `thirdPartyErrorFilterIntegration`
 * writes, and the frame filenames `createReactNativeRewriteFrames` produces.
 *
 * Drops leave no trace. To check the predicate has not gone inert, watch total `third_party_code:True` volume per
 * release, as described in GH #93837.
 */
const injectedScriptRecursionNoiseFilterIntegration: Integration = {
    name: 'InjectedScriptRecursionNoiseFilter',
    processEvent: (event) => (isInjectedScriptRecursionNoise(event) ? null : event),
};

export default injectedScriptRecursionNoiseFilterIntegration;
export {isInjectedScriptRecursionNoise, STACK_OVERFLOW_MESSAGES};

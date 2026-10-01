import {THIRD_PARTY_CODE_TAG} from '@libs/telemetry/integrations/classCallCheckNoiseFilter';
import {injectedScriptRecursionNoiseFilterIntegration as webInjectedScriptRecursionNoiseFilterIntegration} from '@libs/telemetry/integrations/index.web';
import injectedScriptRecursionNoiseFilterIntegration, {isInjectedScriptRecursionNoise} from '@libs/telemetry/integrations/injectedScriptRecursionNoiseFilter';

import type {Client, ErrorEvent, Exception, StackFrame} from '@sentry/core';

const THIRD_PARTY_TAGS: ErrorEvent['tags'] = {[THIRD_PARTY_CODE_TAG]: true};

const STACK_OVERFLOW_MESSAGE = 'Maximum call stack size exceeded';

/** The recursion signature every GH #102044 sibling carries: `Ok` and `Qk` calling each other at line 226. */
function buildRecursionFrames(filename: string): StackFrame[] {
    return [
        {filename, lineno: 226, colno: 63, function: 'Ok'},
        {filename, lineno: 226, colno: 408, function: 'Qk'},
        {filename, lineno: 226, colno: 63, function: 'Ok'},
        {filename, lineno: 226, colno: 408, function: 'Qk'},
    ];
}

/** `type: undefined` is what marks an error event in the SDK types, as opposed to `'transaction'`. */
function buildEvent(values: Exception[], tags: ErrorEvent['tags'] = THIRD_PARTY_TAGS): ErrorEvent {
    return {type: undefined, tags, exception: {values}};
}

function buildStackOverflowEvent(frames: StackFrame[], tags: ErrorEvent['tags'] = THIRD_PARTY_TAGS, value = STACK_OVERFLOW_MESSAGE): ErrorEvent {
    return buildEvent([{type: 'RangeError', value, stacktrace: {frames}}], tags);
}

describe('injectedScriptRecursionNoiseFilter', () => {
    describe('recognizes the GH #102044 signature', () => {
        it('matches the APP-M6P event shape, named after the /home document', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent(buildRecursionFrames('app:///home')))).toBe(true);
        });

        it.each(['app:///work-email', 'app:///profile', 'app:///subscription'])('matches the sibling issues filed under other routes (%s)', (filename) => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent(buildRecursionFrames(filename)))).toBe(true);
        });

        it('matches the root route, whose document URL rewrites to an empty basename', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent(buildRecursionFrames('app:///')))).toBe(true);
        });

        it('matches a document URL whose query string or fragment contains dots', () => {
            const event = buildStackOverflowEvent([{filename: 'app:///home?email=user.name'}, {filename: 'app:///subscription#section.1'}]);
            expect(isInjectedScriptRecursionNoise(event)).toBe(true);
        });

        it('matches the JavaScriptCore spelling of the message, which ends in a period', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent(buildRecursionFrames('app:///home'), THIRD_PARTY_TAGS, `${STACK_OVERFLOW_MESSAGE}.`))).toBe(true);
        });

        it('matches a mix of route-named and anonymous frames', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent([{filename: 'app:///home'}, {filename: 'app:///<anonymous>'}, {filename: '[native code]'}]))).toBe(true);
        });
    });

    describe('leaves everything else alone', () => {
        it('keeps the signature when a frame is attributable to our bundle', () => {
            const event = buildStackOverflowEvent([{filename: 'app:///home'}, {filename: 'app:///main-bac62f7979647f1d.bundle.js'}]);
            expect(isInjectedScriptRecursionNoise(event)).toBe(false);
        });

        it('keeps the signature when the recursion is in a named third-party script', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent(buildRecursionFrames('app:///gtm.js?id=GTM-XXXX')))).toBe(false);
        });

        it('keeps the signature when the event is not tagged third-party', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent(buildRecursionFrames('app:///home'), {}))).toBe(false);
        });

        it('keeps a different error thrown from a route-named frame', () => {
            const event = buildEvent([{type: 'TypeError', value: "Cannot read properties of undefined (reading 'se')", stacktrace: {frames: buildRecursionFrames('app:///home')}}]);
            expect(isInjectedScriptRecursionNoise(event)).toBe(false);
        });

        it('keeps the message when it is not a RangeError', () => {
            const event = buildEvent([{type: 'Error', value: STACK_OVERFLOW_MESSAGE, stacktrace: {frames: buildRecursionFrames('app:///home')}}]);
            expect(isInjectedScriptRecursionNoise(event)).toBe(false);
        });

        it('keeps a chained error when only one value is the signature', () => {
            const event = buildEvent([
                {type: 'RangeError', value: STACK_OVERFLOW_MESSAGE, stacktrace: {frames: [{filename: 'app:///home'}]}},
                {type: 'Error', value: 'something real', stacktrace: {frames: [{filename: 'app:///home'}]}},
            ]);
            expect(isInjectedScriptRecursionNoise(event)).toBe(false);
        });

        it('keeps the signature when it carries no frames at all', () => {
            expect(isInjectedScriptRecursionNoise(buildEvent([{type: 'RangeError', value: STACK_OVERFLOW_MESSAGE}]))).toBe(false);
        });

        it('keeps a frame whose filename was not rewritten', () => {
            expect(isInjectedScriptRecursionNoise(buildStackOverflowEvent([{filename: 'https://new.expensify.com/home'}]))).toBe(false);
        });

        it('keeps a transaction event, which never carries exception values', () => {
            expect(isInjectedScriptRecursionNoise({type: 'transaction', tags: THIRD_PARTY_TAGS})).toBe(false);
        });
    });

    describe('as a Sentry integration', () => {
        // `processEvent` ignores its client argument, so an empty stub satisfies the signature without stubbing the SDK.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the filter never reads the client, this only satisfies the hook signature
        const client = Object.create(null) as Client;
        const processEvent = (event: ErrorEvent) => injectedScriptRecursionNoiseFilterIntegration.processEvent?.(event, {}, client);

        it('is named so it can be identified in the integrations list', () => {
            expect(injectedScriptRecursionNoiseFilterIntegration.name).toBe('InjectedScriptRecursionNoiseFilter');
        });

        it('drops the noise', () => {
            expect(processEvent(buildStackOverflowEvent(buildRecursionFrames('app:///home')))).toBeNull();
        });

        it('passes anything else through untouched', () => {
            const event = buildStackOverflowEvent(buildRecursionFrames('app:///main-bac62f7979647f1d.bundle.js'));
            expect(processEvent(event)).toBe(event);
        });
    });

    // `setupSentryIntegrationOrderTest` mocks the whole integrations module, so assert the real web index exports the
    // real filter rather than the `undefined` stub the native index ships.
    describe('web export wiring', () => {
        it('re-exports the real filter from the unmocked web index', () => {
            expect(webInjectedScriptRecursionNoiseFilterIntegration).toBe(injectedScriptRecursionNoiseFilterIntegration);
        });
    });
});

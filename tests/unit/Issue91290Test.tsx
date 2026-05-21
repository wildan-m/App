import {render} from '@testing-library/react-native';
import React from 'react';
import FullstoryInitHandler from '@src/FullstoryInitHandler';
import Log from '@libs/Log';

/**
 * Regression test for https://github.com/Expensify/App/issues/91290
 *
 * When the Fullstory session has been initialized and then shut down (ad-blocker kills fs.js,
 * GDPR / Do-Not-Track opt-out, or a prior FS('shutdown') call), `FS.getSessionURL()` rejects
 * with `Error: Shutdown called`. The promise chain in FullstoryInitHandler previously had no
 * `.catch()`, so the rejection escaped as a top-level unhandled rejection and tripped the global
 * error boundary ("Uh-oh, something went wrong!"), crashing the web app.
 *
 * The fix attaches a `.catch()` that swallows the rejection and logs it via Log.warn instead of
 * letting it crash the app.
 */

const mockSetContext = jest.fn();
jest.mock('@sentry/react-native', () => ({
    setContext: (...args: unknown[]) => mockSetContext(...args),
}));

// Avoid pulling the full Onyx layer into this unit test.
jest.mock('@hooks/useOnyx', () => () => [undefined]);

const mockInit = jest.fn();
const mockGetSessionURL = jest.fn();
jest.mock('@libs/Fullstory', () => ({
    __esModule: true,
    default: {
        init: (...args: unknown[]) => mockInit(...args),
        getSessionURL: () => mockGetSessionURL(),
    },
}));

const flushPromises = () => new Promise(process.nextTick);

describe('Issue #91290 - Fullstory shutdown unhandled rejection crash', () => {
    let unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);

    beforeEach(() => {
        unhandledRejections = [];
        mockSetContext.mockClear();
        mockInit.mockClear();
        mockGetSessionURL.mockReset();
        process.on('unhandledRejection', onUnhandledRejection);
    });

    afterEach(() => {
        process.off('unhandledRejection', onUnhandledRejection);
    });

    it('does not produce an unhandled rejection and logs a warning when the Fullstory session is shut down', async () => {
        const warnSpy = jest.spyOn(Log, 'warn').mockImplementation(() => undefined);
        mockGetSessionURL.mockReturnValue(Promise.reject(new Error('Shutdown called')));

        render(<FullstoryInitHandler />);
        await flushPromises();

        // The rejection must be caught locally — it must never bubble up as an unhandled rejection.
        expect(unhandledRejections).toHaveLength(0);
        // The shutdown is logged for telemetry instead of crashing the app.
        expect(warnSpy).toHaveBeenCalled();
        // No session URL is available, so no Sentry Fullstory context should be set.
        expect(mockSetContext).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('still sets the Sentry Fullstory context when a session URL is available', async () => {
        const warnSpy = jest.spyOn(Log, 'warn').mockImplementation(() => undefined);
        mockGetSessionURL.mockReturnValue(Promise.resolve('https://app.fullstory.com/ui/session/123'));

        render(<FullstoryInitHandler />);
        await flushPromises();

        expect(unhandledRejections).toHaveLength(0);
        expect(mockSetContext).toHaveBeenCalledTimes(1);
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });
});

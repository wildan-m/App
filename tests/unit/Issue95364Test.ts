import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import getStateFromPath from '@libs/Navigation/helpers/getStateFromPath';
import Navigation from '@libs/Navigation/Navigation';

import type {Route} from '@src/ROUTES';
import {DYNAMIC_ROUTES} from '@src/ROUTES';

/**
 * Regression test for https://github.com/Expensify/App/issues/95364
 *
 * The "replacement card" hyperlink in the card-issued/replaced system message is built in
 * `getCardIssuedMessage` with `createDynamicRoute`, which prepends the current screen
 * (`Navigation.getActiveRoute()`) to the `expensify-card-details/:cardID/:policyID` suffix so the
 * card details open on top of wherever the user already is.
 *
 * A dynamic route only resolves when the screen it is appended to is registered in that route's
 * `entryScreens`. The Search ("Spend") page was missing from `EXPENSIFY_CARD_DETAILS.entryScreens`,
 * so a link generated there produced a path that failed `entryScreens` validation in
 * `getStateFromPath` and rendered the "Not Here" (NotFoundPage) screen.
 */
describe('Issue #95364 - replacement card hyperlink resolves instead of showing Not Here', () => {
    const SUFFIX = DYNAMIC_ROUTES.EXPENSIFY_CARD_DETAILS.getRoute('678', '9012');
    const chatQuery = `q=${encodeURIComponent('type:chat')}`;
    const expenseQuery = `q=${encodeURIComponent('type:expense')}`;

    function isNotFound(route: Route): boolean {
        const state = getStateFromPath(route);
        return JSON.stringify(state).includes('not-found');
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('resolves when the message is viewed from the Spend > Chat page', () => {
        jest.spyOn(Navigation, 'getActiveRoute').mockReturnValue(`search?${chatQuery}`);
        const link = createDynamicRoute(SUFFIX);

        expect(link).toBe(`search/expensify-card-details/678/9012?${chatQuery}`);
        expect(isNotFound(link)).toBe(false);
    });

    it('resolves when the message is viewed from a report', () => {
        jest.spyOn(Navigation, 'getActiveRoute').mockReturnValue('r/12345');
        const link = createDynamicRoute(SUFFIX);

        expect(link).toBe('r/12345/expensify-card-details/678/9012');
        expect(isNotFound(link)).toBe(false);
    });

    it('keeps the user on their current screen rather than sending them to the workspace', () => {
        // The card details should open on top of the screen the user is already on, so the
        // generated link must stay anchored to the active route.
        jest.spyOn(Navigation, 'getActiveRoute').mockReturnValue('search/view/12345');
        const link = createDynamicRoute(SUFFIX);

        expect(link.startsWith('search/view/12345/')).toBe(true);
        expect(isNotFound(link)).toBe(false);
    });

    it.each([['search'], [`search?${expenseQuery}`], ['search/r/12345'], ['workspaces/9012/expensify-card']])('resolves from entry screen %s', (activeRoute) => {
        jest.spyOn(Navigation, 'getActiveRoute').mockReturnValue(activeRoute);

        expect(isNotFound(createDynamicRoute(SUFFIX))).toBe(false);
    });
});

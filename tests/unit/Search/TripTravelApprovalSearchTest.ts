import {renderHook, waitFor} from '@testing-library/react-native';

import {LocaleContextProvider} from '@components/LocaleContextProvider';

import useAdvancedSearchFilters from '@hooks/useAdvancedSearchFilters';

import {buildFilterFormValuesFromQuery, buildSearchQueryJSON} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@src/libs/Log');

jest.mock('@src/libs/API', () => ({
    write: jest.fn(),
    makeRequestWithSideEffects: jest.fn(),
    read: jest.fn(),
}));

jest.mock('@src/libs/Navigation/Navigation', () => ({
    dismissModalWithReport: jest.fn(),
    getTopmostReportId: jest.fn(),
    isNavigationReady: jest.fn(() => Promise.resolve()),
    isDisplayedInModal: jest.fn(() => false),
}));

jest.mock('@hooks/useExportedToFilterOptions', () => ({
    __esModule: true,
    default: () => ({
        exportedToFilterOptions: [],
        connectedIntegrationNames: new Set<string>(),
    }),
}));

const mockIsBetaEnabled = jest.fn((): boolean => false);
jest.mock('@hooks/usePermissions', () => jest.fn(() => ({isBetaEnabled: mockIsBetaEnabled, isBetaEnabledOrUnknown: mockIsBetaEnabled})));

jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual<typeof NativeNavigation>('@react-navigation/native');
    return {
        ...actualNav,
        useFocusEffect: jest.fn(),
        useIsFocused: () => true,
        useRoute: () => jest.fn(),
        usePreventRemove: () => jest.fn(),
        useNavigation: () => ({
            navigate: jest.fn(),
            addListener: () => jest.fn(),
        }),
        createNavigationContainerRef: () => ({
            addListener: () => jest.fn(),
            removeListener: () => jest.fn(),
            isReady: () => jest.fn(),
            getCurrentRoute: () => jest.fn(),
            getState: () => jest.fn(),
        }),
        useNavigationState: () => ({
            routes: [],
        }),
    };
});

function wrapper({children}: {children: React.ReactNode}) {
    return React.createElement(LocaleContextProvider, null, children);
}

describe('Trip search under the TRAVEL_APPROVAL beta', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        mockIsBetaEnabled.mockReturnValue(false);
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    describe('legacy trip status mapping', () => {
        it('maps current and past to upcoming and done when the beta is enabled', () => {
            // Given a saved search that still uses the legacy trip statuses
            const queryJSON = buildSearchQueryJSON('type:trip status:current,past');

            if (!queryJSON) {
                throw new Error('Failed to parse query');
            }

            // When the filter form is built with the TRAVEL_APPROVAL beta enabled
            const form = buildFilterFormValuesFromQuery(queryJSON, {}, {}, {}, {}, {}, {}, undefined, undefined, undefined, true);

            // Then the legacy statuses mean the new ones, so the saved search keeps working
            expect(form.status).toEqual([CONST.SEARCH.STATUS.TRIP.UPCOMING, CONST.SEARCH.STATUS.TRIP.DONE]);
        });

        it('keeps the legacy trip statuses untouched when the beta is disabled', () => {
            // Given a saved search that uses the legacy trip statuses
            const queryJSON = buildSearchQueryJSON('type:trip status:current,past');

            if (!queryJSON) {
                throw new Error('Failed to parse query');
            }

            // When the filter form is built without the TRAVEL_APPROVAL beta
            const form = buildFilterFormValuesFromQuery(queryJSON, {}, {}, {}, {}, {}, {});

            // Then the stored values pass through unchanged, preserving today's behavior
            expect(form.status).toEqual([CONST.SEARCH.STATUS.TRIP_LEGACY.CURRENT, CONST.SEARCH.STATUS.TRIP_LEGACY.PAST]);
        });

        it('does not rewrite statuses of non-trip searches when the beta is enabled', () => {
            // Given an expense search whose status is unrelated to trips
            const queryJSON = buildSearchQueryJSON('type:expense status:paid');

            if (!queryJSON) {
                throw new Error('Failed to parse query');
            }

            // When the filter form is built with the TRAVEL_APPROVAL beta enabled
            const form = buildFilterFormValuesFromQuery(queryJSON, {}, {}, {}, {}, {}, {}, undefined, undefined, undefined, true);

            // Then the mapping only applies to trips
            expect(form.status).toEqual([CONST.SEARCH.STATUS.EXPENSE.PAID]);
        });
    });

    describe('trip filter list', () => {
        it('offers only Status, Date, Workspace and From when the beta is enabled', async () => {
            // Given the TRAVEL_APPROVAL beta is enabled
            mockIsBetaEnabled.mockImplementation(() => true);

            // When the advanced filters are computed for trips
            const {result} = renderHook(() => useAdvancedSearchFilters(CONST.SEARCH.DATA_TYPES.TRIP), {wrapper});

            await waitFor(() => {
                const allKeys = result.current.flat();
                // Then only the type selector plus Status, From, Workspace and Date are offered
                const allowedKeys: string[] = [
                    CONST.SEARCH.SYNTAX_FILTER_KEYS.TYPE,
                    CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS,
                    CONST.SEARCH.SYNTAX_FILTER_KEYS.FROM,
                    CONST.SEARCH.SYNTAX_FILTER_KEYS.POLICY_ID,
                    CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE,
                ];
                expect(allKeys.length).toBeGreaterThan(0);
                expect(allKeys.every((key) => allowedKeys.includes(key))).toBe(true);
                expect(allKeys).toContain(CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS);
                expect(allKeys).toContain(CONST.SEARCH.SYNTAX_FILTER_KEYS.FROM);
                expect(allKeys).toContain(CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE);
            });
        });

        it('keeps the expense-style trip filter list when the beta is disabled', async () => {
            // Given the TRAVEL_APPROVAL beta is disabled
            mockIsBetaEnabled.mockImplementation(() => false);

            // When the advanced filters are computed for trips
            const {result} = renderHook(() => useAdvancedSearchFilters(CONST.SEARCH.DATA_TYPES.TRIP), {wrapper});

            await waitFor(() => {
                const allKeys = result.current.flat();
                // Then today's wider list is still offered, including the expense-style filters
                expect(allKeys).toContain(CONST.SEARCH.SYNTAX_FILTER_KEYS.MERCHANT);
                expect(allKeys).toContain(CONST.SEARCH.SYNTAX_FILTER_KEYS.CATEGORY);
                expect(allKeys).toContain(CONST.SEARCH.SYNTAX_FILTER_KEYS.TO);
            });
        });
    });
});

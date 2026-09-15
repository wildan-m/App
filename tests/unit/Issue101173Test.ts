import {buildQueryStringFromFilterFormValues, buildSearchQueryJSON, doesQueryMatchDefaultFilterKeysAndType} from '@libs/SearchQueryUtils';
import {getSuggestedSearches} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';

describe('Issue 101173 - Home approve todo navigates to correct search key', () => {
    const accountID = 999999;

    it('ForYou approve query hash matches the Needs approval suggested search hash', () => {
        const suggested = getSuggestedSearches(accountID);
        const approveSuggested = suggested[CONST.SEARCH.SEARCH_KEYS.APPROVE];
        const reportsSuggested = suggested[CONST.SEARCH.SEARCH_KEYS.REPORTS];

        const forYouApproveQuery = buildQueryStringFromFilterFormValues({
            type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT,
            action: CONST.SEARCH.ACTION_FILTERS.APPROVE,
            to: [`${accountID}`],
        });

        const forYouJSON = buildSearchQueryJSON(forYouApproveQuery);

        console.log('approveSuggested.searchQuery =', approveSuggested.searchQuery);
        console.log('forYouApproveQuery          =', forYouApproveQuery);
        console.log('approveSuggested.similarSearchHash =', approveSuggested.similarSearchHash);
        console.log('forYou.similarSearchHash           =', forYouJSON?.similarSearchHash);
        console.log('reportsSuggested.similarSearchHash =', reportsSuggested.similarSearchHash);

        expect(forYouJSON?.similarSearchHash).toBe(approveSuggested.similarSearchHash);
        expect(forYouJSON?.similarSearchHash).not.toBe(reportsSuggested.similarSearchHash);
    });

    it('resolving the ForYou approve query returns APPROVE key, not the generic REPORTS key', () => {
        const suggested = getSuggestedSearches(accountID);
        const typeToGenericKey: Record<string, string> = {
            [CONST.SEARCH.DATA_TYPES.EXPENSE]: CONST.SEARCH.SEARCH_KEYS.EXPENSES,
            [CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT]: CONST.SEARCH.SEARCH_KEYS.REPORTS,
        };

        const forYouApproveQuery = buildQueryStringFromFilterFormValues({
            type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT,
            action: CONST.SEARCH.ACTION_FILTERS.APPROVE,
            to: [`${accountID}`],
        });
        const forYouJSON = buildSearchQueryJSON(forYouApproveQuery);

        const matchedKey =
            Object.values(suggested).find((search) => search.similarSearchHash === forYouJSON?.similarSearchHash)?.key ?? (forYouJSON?.type ? typeToGenericKey[forYouJSON.type] : undefined);

        console.log('matchedKey =', matchedKey);
        expect(matchedKey).toBe(CONST.SEARCH.SEARCH_KEYS.APPROVE);
    });

    it('resolves the current search key to APPROVE when navigating from a Reports search to the approve query', () => {
        const suggested = getSuggestedSearches(accountID);
        const typeToGenericKey: Record<string, string> = {
            [CONST.SEARCH.DATA_TYPES.EXPENSE]: CONST.SEARCH.SEARCH_KEYS.EXPENSES,
            [CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT]: CONST.SEARCH.SEARCH_KEYS.REPORTS,
        };
        const getSearchKeyForQuery = (queryJSON: ReturnType<typeof buildSearchQueryJSON>) =>
            Object.values(suggested).find((search) => search.similarSearchHash === queryJSON?.similarSearchHash)?.key ?? (queryJSON?.type ? typeToGenericKey[queryJSON.type] : undefined);

        // The user is on the generic "Reports" suggested search (same expenseReport type).
        const currentSearchKey = CONST.SEARCH.SEARCH_KEYS.REPORTS;
        const currentDefaultJSON = buildSearchQueryJSON(suggested[CONST.SEARCH.SEARCH_KEYS.REPORTS].searchQuery);

        // They click the Home "Needs approval" to-do (multiple reports -> navigates to the approve search by URL only).
        const forYouApproveQuery = buildQueryStringFromFilterFormValues({
            type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT,
            action: CONST.SEARCH.ACTION_FILTERS.APPROVE,
            to: [`${accountID}`],
        });
        const newQueryJSON = buildSearchQueryJSON(forYouApproveQuery);

        // The approve query is a SUPERSET of the reports default (same type, contains all its filter keys), so the
        // original guard alone reports "still matches" and would skip the reset, leaving the key stuck on REPORTS.
        expect(doesQueryMatchDefaultFilterKeysAndType(newQueryJSON, currentDefaultJSON)).toBe(true);

        // SearchQueryProvider's condition after the fix: reset when the query no longer matches the current key's
        // defaults OR when the query now resolves to a different suggested search key than the current one.
        const shouldReset = !doesQueryMatchDefaultFilterKeysAndType(newQueryJSON, currentDefaultJSON) || getSearchKeyForQuery(newQueryJSON) !== currentSearchKey;
        expect(shouldReset).toBe(true);

        const resolvedKey = shouldReset ? getSearchKeyForQuery(newQueryJSON) : currentSearchKey;
        expect(resolvedKey).toBe(CONST.SEARCH.SEARCH_KEYS.APPROVE);
    });
});

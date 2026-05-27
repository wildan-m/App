import {buildFilterFormValuesFromQuery, buildFilterQueryWithSortDefaults, buildSearchQueryJSON} from '@libs/SearchQueryUtils';
import {getSuggestedSearches} from '@libs/SearchUIUtils';
import CONST from '@src/CONST';

/**
 * Regression test for https://github.com/Expensify/App/issues/91790
 *
 * The "Card accruals" (and "Statements") suggested search lost its highlight after the user
 * opened the Feed filter, selected feeds, and applied. When no default card feed exists the
 * suggested search was built with a `['']` feed placeholder which serialized to a bare `feed:`
 * token that the parser read as a free-text keyword (not a feed filter). Its `similarSearchHash`
 * therefore never matched the hash of a query carrying a real feed filter, so the suggested
 * search stopped being recognised as active and the highlight disappeared.
 */
describe('Issue 91790 - Card accruals highlight persists after applying feeds', () => {
    const ACCOUNT_ID = 12345;
    const FEED_A = '18755165_Expensify Card';
    const FEED_B = '22334455_Visa';

    /** Emulates opening the Feed filter, selecting two feeds, and applying (useUpdateFilterQuery). */
    function applyFeeds(navQuery: string, feeds: string[]) {
        const nav = buildSearchQueryJSON(navQuery);
        const form = buildFilterFormValuesFromQuery(nav!, undefined, undefined, {}, {}, {}, {}, {}, [], ACCOUNT_ID);
        const updatedForm = {...form, feed: feeds};
        const appliedQuery = buildFilterQueryWithSortDefaults(updatedForm, {view: form.view, groupBy: form.groupBy}, {sortBy: nav!.sortBy, sortOrder: nav!.sortOrder});
        return buildSearchQueryJSON(appliedQuery ?? '');
    }

    it('does not emit a stray keyword filter when there is no default card feed', () => {
        const card = getSuggestedSearches(ACCOUNT_ID, undefined)[CONST.SEARCH.SEARCH_KEYS.UNAPPROVED_CARD];
        const parsed = buildSearchQueryJSON(card.searchQuery);
        const hasKeywordFilter = parsed?.flatFilters.some((filter) => filter.key === CONST.SEARCH.SYNTAX_FILTER_KEYS.KEYWORD);
        expect(hasKeywordFilter).toBe(false);
    });

    it('keeps Card accruals highlighted after applying feeds when there is no default feed', () => {
        const card = getSuggestedSearches(ACCOUNT_ID, undefined)[CONST.SEARCH.SEARCH_KEYS.UNAPPROVED_CARD];
        const applied = applyFeeds(card.searchQuery, [FEED_A, FEED_B]);
        expect(applied?.similarSearchHash).toBe(card.similarSearchHash);
    });

    it('keeps Card accruals highlighted after applying feeds when a default feed exists', () => {
        const card = getSuggestedSearches(ACCOUNT_ID, FEED_A)[CONST.SEARCH.SEARCH_KEYS.UNAPPROVED_CARD];
        const applied = applyFeeds(card.searchQuery, [FEED_A, FEED_B]);
        expect(applied?.similarSearchHash).toBe(card.similarSearchHash);
    });

    it('keeps Statements highlighted after applying feeds when there is no default feed', () => {
        const statements = getSuggestedSearches(ACCOUNT_ID, undefined)[CONST.SEARCH.SEARCH_KEYS.STATEMENTS];
        const applied = applyFeeds(statements.searchQuery, [FEED_A, FEED_B]);
        expect(applied?.similarSearchHash).toBe(statements.similarSearchHash);
    });

    it('keeps every suggested search distinct (no hash collisions)', () => {
        const all = getSuggestedSearches(ACCOUNT_ID, FEED_A);
        const hashes = Object.values(all).map((search) => search.similarSearchHash);
        expect(new Set(hashes).size).toBe(hashes.length);
    });
});

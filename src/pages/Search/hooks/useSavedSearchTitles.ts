import {useDeferredValue, useMemo} from 'react';
import {buildSearchQueryJSON, buildUserReadableQueryString} from '@libs/SearchQueryUtils';
import type {SaveSearchItem} from '@src/types/onyx/SaveSearch';

type SavedSearchCollection = Record<string, SaveSearchItem>;
type UserReadableQueryParams = Parameters<typeof buildUserReadableQueryString>[0];

type SavedSearchTitlesHookParams = {
    savedSearches: SavedSearchCollection | undefined;
    personalDetails: UserReadableQueryParams['PersonalDetails'];
    reports: UserReadableQueryParams['reports'];
    taxRates: UserReadableQueryParams['taxRates'];
    cardsForSavedSearchDisplay: UserReadableQueryParams['cardList'];
    allFeeds: UserReadableQueryParams['cardFeeds'];
    allPolicies: UserReadableQueryParams['policies'];
    currentUserAccountID: number;
    translate: UserReadableQueryParams['translate'];
    feedKeysWithCards: UserReadableQueryParams['feedKeysWithCards'];
    reportAttributes: UserReadableQueryParams['reportAttributes'];
    shouldBuildTitles?: boolean;
    allowEmptyQueryJSONFallback?: boolean;
};

function useSavedSearchTitles({
    savedSearches,
    personalDetails,
    reports,
    taxRates,
    cardsForSavedSearchDisplay,
    allFeeds,
    allPolicies,
    currentUserAccountID,
    translate,
    feedKeysWithCards,
    reportAttributes,
    shouldBuildTitles = true,
    allowEmptyQueryJSONFallback = true,
}: SavedSearchTitlesHookParams): Map<string, string> {
    const deferredReports = useDeferredValue(reports);
    const deferredPolicies = useDeferredValue(allPolicies);
    const deferredPersonalDetails = useDeferredValue(personalDetails);
    const deferredReportAttributes = useDeferredValue(reportAttributes);
    const deferredTaxRates = useDeferredValue(taxRates);
    const deferredCardsForSavedSearchDisplay = useDeferredValue(cardsForSavedSearchDisplay);
    const deferredAllFeeds = useDeferredValue(allFeeds);
    const deferredFeedKeysWithCards = useDeferredValue(feedKeysWithCards);

    return useMemo(() => {
        const titles = new Map<string, string>();

        if (!savedSearches || !shouldBuildTitles) {
            return titles;
        }

        for (const item of Object.values(savedSearches)) {
            if (item.name !== item.query || titles.has(item.query)) {
                continue;
            }

            const itemJsonQuery = buildSearchQueryJSON(item.query);
            if (!itemJsonQuery && !allowEmptyQueryJSONFallback) {
                continue;
            }

            const title = buildUserReadableQueryString({
                queryJSON: itemJsonQuery ?? ({} as UserReadableQueryParams['queryJSON']),
                PersonalDetails: deferredPersonalDetails,
                reports: deferredReports,
                taxRates: deferredTaxRates,
                cardList: deferredCardsForSavedSearchDisplay,
                cardFeeds: deferredAllFeeds,
                policies: deferredPolicies,
                currentUserAccountID,
                autoCompleteWithSpace: false,
                translate,
                feedKeysWithCards: deferredFeedKeysWithCards,
                reportAttributes: deferredReportAttributes,
            });
            titles.set(item.query, title);
        }

        return titles;
    }, [
        deferredAllFeeds,
        deferredPolicies,
        allowEmptyQueryJSONFallback,
        deferredCardsForSavedSearchDisplay,
        currentUserAccountID,
        deferredFeedKeysWithCards,
        deferredPersonalDetails,
        deferredReportAttributes,
        deferredReports,
        savedSearches,
        shouldBuildTitles,
        deferredTaxRates,
        translate,
    ]);
}

export default useSavedSearchTitles;
export type {SavedSearchCollection};

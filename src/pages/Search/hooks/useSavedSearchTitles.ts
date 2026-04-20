import {useMemo} from 'react';
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
                PersonalDetails: personalDetails,
                reports,
                taxRates,
                cardList: cardsForSavedSearchDisplay,
                cardFeeds: allFeeds,
                policies: allPolicies,
                currentUserAccountID,
                autoCompleteWithSpace: false,
                translate,
                feedKeysWithCards,
                reportAttributes,
            });
            titles.set(item.query, title);
        }

        return titles;
    }, [
        allFeeds,
        allPolicies,
        allowEmptyQueryJSONFallback,
        cardsForSavedSearchDisplay,
        currentUserAccountID,
        feedKeysWithCards,
        personalDetails,
        reportAttributes,
        reports,
        savedSearches,
        shouldBuildTitles,
        taxRates,
        translate,
    ]);
}

export default useSavedSearchTitles;
export type {SavedSearchCollection};

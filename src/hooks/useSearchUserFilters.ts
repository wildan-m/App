import {openSearchUserFiltersPage} from '@libs/actions/Search';

import CONST from '@src/CONST';

import {useEffect, useRef, useState} from 'react';

import useNetwork from './useNetwork';

type UseSearchUserFiltersResult = {
    /** Whether the first page for the current search term is in flight */
    isSearching: boolean;

    /** Whether the next page of people is loading */
    isLoadingMore: boolean;

    /** Load the next page of people for the current search term */
    loadMore: () => void;
};

/**
 * Looks up people for the Search user filters on the server as the user types, so people whose personal details
 * aren't loaded yet (e.g. former workspace members) can still be found. The results land in personal details,
 * so the caller's option list picks them up without any extra merging.
 * A blank search term makes no request, since the locally loaded people already cover it.
 */
function useSearchUserFilters(searchTerm: string, policyIDs: string): UseSearchUserFiltersResult {
    const {isOffline} = useNetwork();
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const paginationRef = useRef({hasMore: false, nextCursor: '', searchQuery: ''});
    const requestSeqRef = useRef(0);
    const trimmedSearchTerm = searchTerm.trim();

    useEffect(() => {
        const requestSeq = ++requestSeqRef.current;
        paginationRef.current = {hasMore: false, nextCursor: '', searchQuery: trimmedSearchTerm};
        setIsLoadingMore(false);

        if (isOffline || !trimmedSearchTerm) {
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        openSearchUserFiltersPage({searchQuery: trimmedSearchTerm, cursor: '', limit: CONST.SEARCH.USER_FILTER_PAGE_SIZE, policyIDs: policyIDs || undefined}, true)
            .then(({hasMore, nextCursor}) => {
                if (requestSeq !== requestSeqRef.current) {
                    return;
                }
                paginationRef.current = {hasMore, nextCursor, searchQuery: trimmedSearchTerm};
            })
            // Failures are already logged by the network Logging middleware. Cancelled requests are expected when a newer search supersedes them.
            .catch(() => {})
            .finally(() => {
                if (requestSeq !== requestSeqRef.current) {
                    return;
                }
                setIsSearching(false);
            });
    }, [trimmedSearchTerm, policyIDs, isOffline]);

    const loadMore = () => {
        const {hasMore, nextCursor, searchQuery} = paginationRef.current;
        if (isSearching || isLoadingMore || !hasMore || isOffline || !searchQuery) {
            return;
        }

        const requestSeq = requestSeqRef.current;
        setIsLoadingMore(true);
        openSearchUserFiltersPage({searchQuery, cursor: nextCursor, limit: CONST.SEARCH.USER_FILTER_PAGE_SIZE, policyIDs: policyIDs || undefined})
            .then(({hasMore: newHasMore, nextCursor: newNextCursor}) => {
                if (requestSeq !== requestSeqRef.current) {
                    return;
                }
                paginationRef.current = {hasMore: newHasMore, nextCursor: newNextCursor, searchQuery};
            })
            // Failures are already logged by the network Logging middleware. Cancelled requests are expected when a newer search supersedes them.
            .catch(() => {})
            .finally(() => {
                if (requestSeq !== requestSeqRef.current) {
                    return;
                }
                setIsLoadingMore(false);
            });
    };

    return {isSearching, isLoadingMore, loadMore};
}

export default useSearchUserFilters;

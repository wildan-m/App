type OpenSearchUserFiltersPageResponse = {
    /** Whether more pages of people are available */
    hasMore?: boolean;

    /** Pagination cursor to pass for fetching the next page of people */
    nextCursor?: string;
};

export default OpenSearchUserFiltersPageResponse;

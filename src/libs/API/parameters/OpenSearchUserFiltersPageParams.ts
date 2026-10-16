type OpenSearchUserFiltersPageParams = {
    /** Search query to match people by name, login or phone number */
    searchQuery?: string;

    /** Cursor for pagination */
    cursor?: string;

    /** Maximum number of people to return per page */
    limit?: number;

    /** Comma-separated list of policy IDs to scope the people search to the members of specific workspaces */
    policyIDs?: string;

    /** Whether the request can be aborted when superseded by a newer search */
    canCancel?: boolean;
};

export default OpenSearchUserFiltersPageParams;

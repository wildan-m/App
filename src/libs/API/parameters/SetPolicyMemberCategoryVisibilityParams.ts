type SetPolicyMemberCategoryVisibilityParams = {
    policyID: string;

    /** Stringified JSON array of the account IDs whose category visibility is being set */
    accountIDs: string;

    /** Stringified JSON array of the names of the categories the members can use */
    categories: string;
};

export default SetPolicyMemberCategoryVisibilityParams;

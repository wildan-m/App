type SetReimbursementCountriesParams = {
    policyID: string;

    /** Comma separated list of the country ISO codes the policy collects employee bank details for */
    countryISOList: string;
};

export default SetReimbursementCountriesParams;

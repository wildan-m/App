type SetPolicyVendorsEnabledParams = {
    policyID: string;
    /**
     * Stringified JSON object with type of following structure:
     * Array<{vendorID: string; enabled: boolean}>
     */
    vendors: string;
};

export default SetPolicyVendorsEnabledParams;

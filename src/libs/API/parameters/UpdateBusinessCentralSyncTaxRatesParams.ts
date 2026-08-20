type UpdateBusinessCentralSyncTaxRatesParams = {
    /** The workspace where the setting is updated. */
    policyID: string;

    /** Whether tax rates are imported from Business Central. */
    enabled: boolean;
};

export default UpdateBusinessCentralSyncTaxRatesParams;

type CreateDepositABAAccountParams = {
    /** The workspace that reimburses this account through ABA files */
    policyID: string;

    /** Bank State Branch number, in the xxx-xxx format */
    bsbNumber: string;
    accountNumber: string;
    firstName: string;
    lastName: string;
    addressStreet: string;
    addressCity: string;
};

export default CreateDepositABAAccountParams;

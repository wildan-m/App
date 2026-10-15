type CreateWithdrawalABAAccountParams = {
    /** The workspace whose payment account this becomes, when set up from the workspace workflows */
    policyID?: string;

    /** Bank State Branch number, sent without the hyphen */
    bsbNumber: string;
    accountNumber: string;

    /** The APCA user identification number the bank assigned for ABA file uploads */
    bankUserID: string;
    companyName: string;

    /** Whether generated ABA files end with a balancing debit from this account */
    includeSelfBalancingTransaction: boolean;
};

export default CreateWithdrawalABAAccountParams;

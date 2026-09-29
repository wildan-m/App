import type {BusinessCentralBankAccount} from '@src/types/onyx/Policy';

type UpdateBusinessCentralReimbursementBankAccountParams = {
    policyID: string;
    reimbursementBankAccountID: BusinessCentralBankAccount['id'];
};

export default UpdateBusinessCentralReimbursementBankAccountParams;

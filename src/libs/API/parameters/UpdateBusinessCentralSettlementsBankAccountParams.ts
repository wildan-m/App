import type {BusinessCentralBankAccount} from '@src/types/onyx/Policy';

type UpdateBusinessCentralSettlementsBankAccountParams = {
    policyID: string;
    settlementsBankAccountID: BusinessCentralBankAccount['id'];
};

export default UpdateBusinessCentralSettlementsBankAccountParams;

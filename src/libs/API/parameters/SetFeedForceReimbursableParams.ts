import type {ForceReimbursable} from '@src/types/onyx/CardFeeds';

type SetFeedForceReimbursableParams = {
    policyID: string;
    bankName: string;
    domainAccountID: number;
    forceReimbursable: ForceReimbursable;
};

export default SetFeedForceReimbursableParams;

import type {ValueOf} from 'type-fest';

import type Form from './Form';

const INPUT_IDS = {
    BSB_NUMBER: 'bsbNumber',
    ACCOUNT_NUMBER: 'accountNumber',
    BANK_USER_ID: 'bankUserID',
    COMPANY_NAME: 'companyName',
    INCLUDE_SELF_BALANCING_TRANSACTION: 'includeSelfBalancingTransaction',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

type ABAWithdrawalAccountForm = Form<
    InputID,
    {
        [INPUT_IDS.BSB_NUMBER]: string;
        [INPUT_IDS.ACCOUNT_NUMBER]: string;
        [INPUT_IDS.BANK_USER_ID]: string;
        [INPUT_IDS.COMPANY_NAME]: string;
        [INPUT_IDS.INCLUDE_SELF_BALANCING_TRANSACTION]: boolean;
    }
>;

export type {ABAWithdrawalAccountForm};
export default INPUT_IDS;

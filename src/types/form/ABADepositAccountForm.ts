import type {ValueOf} from 'type-fest';

import type Form from './Form';

const INPUT_IDS = {
    BSB_NUMBER: 'bsbNumber',
    ACCOUNT_NUMBER: 'accountNumber',
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    ADDRESS_STREET: 'addressStreet',
    ADDRESS_CITY: 'addressCity',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

type ABADepositAccountForm = Form<
    InputID,
    {
        [INPUT_IDS.BSB_NUMBER]: string;
        [INPUT_IDS.ACCOUNT_NUMBER]: string;
        [INPUT_IDS.FIRST_NAME]: string;
        [INPUT_IDS.LAST_NAME]: string;
        [INPUT_IDS.ADDRESS_STREET]: string;
        [INPUT_IDS.ADDRESS_CITY]: string;
    }
>;

export type {ABADepositAccountForm};
export default INPUT_IDS;

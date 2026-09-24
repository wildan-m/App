import type {ValueOf} from 'type-fest';

import type Form from './Form';

const INPUT_IDS = {
    DELEGATE: 'delegate',
    CLEAR_AFTER: 'clearAfter',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

type VacationDelegateForm = Form<
    InputID,
    {
        [INPUT_IDS.DELEGATE]: string;
        [INPUT_IDS.CLEAR_AFTER]: string;
    }
>;

export type {VacationDelegateForm};
export default INPUT_IDS;

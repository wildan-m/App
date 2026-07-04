import CONST from '@src/CONST';
import type {PersonalBankAccountForm} from '@src/types/form/PersonalBankAccountForm';
import INPUT_IDS from '@src/types/form/PersonalBankAccountForm';

import type {OnyxEntry} from 'react-native-onyx';

const BANK_INFO_STEP_KEY = INPUT_IDS.BANK_INFO_STEP;

/**
 * Returns the index of the first sub-step of the personal deposit account flow whose required fields
 * are not yet filled in the persisted form draft, so the flow resumes where the user left off instead
 * of always restarting at the first screen. Steps that are skipped (their data already exists in the
 * user's personal details) are passed over, and if every entered step is complete the flow resumes at
 * the final confirmation step.
 *
 * @param draft - the persisted PERSONAL_BANK_ACCOUNT_FORM_DRAFT
 * @param isManual - whether the flow uses the manual bank-details first step (vs the Plaid first step)
 * @param skipSteps - indexes already skipped because the data exists in personal details
 * @param lastIndex - index of the final (confirmation) sub-step to resume at when nothing is incomplete
 */
function getInitialSubstepForPersonalInfo(draft: OnyxEntry<PersonalBankAccountForm>, isManual: boolean, skipSteps: number[], lastIndex: number): number {
    const country = draft?.[BANK_INFO_STEP_KEY.COUNTRY];
    const isUsOrCanada = country === CONST.COUNTRY.US || country === CONST.COUNTRY.CA;

    // Required draft fields for each sub-step, in the order the steps appear in the flow.
    // Index 0 is the bank-info step (manual routing/account vs Plaid selection); the rest are personal-info steps.
    const stepRequiredFields: Array<Array<keyof PersonalBankAccountForm>> = [
        isManual ? [BANK_INFO_STEP_KEY.ROUTING_NUMBER, BANK_INFO_STEP_KEY.ACCOUNT_NUMBER] : [BANK_INFO_STEP_KEY.SELECTED_PLAID_ACCOUNT_ID],
        [BANK_INFO_STEP_KEY.FIRST_NAME, BANK_INFO_STEP_KEY.LAST_NAME],
        isUsOrCanada
            ? [BANK_INFO_STEP_KEY.STREET, BANK_INFO_STEP_KEY.CITY, BANK_INFO_STEP_KEY.STATE, BANK_INFO_STEP_KEY.ZIP_CODE]
            : [BANK_INFO_STEP_KEY.STREET, BANK_INFO_STEP_KEY.CITY, BANK_INFO_STEP_KEY.ZIP_CODE],
        [BANK_INFO_STEP_KEY.PHONE_NUMBER],
    ];

    const firstIncompleteIndex = stepRequiredFields.findIndex((requiredFields, index) => !skipSteps.includes(index) && !requiredFields.every((field) => !!draft?.[field]));

    return firstIncompleteIndex === -1 ? lastIndex : firstIncompleteIndex;
}

export default getInitialSubstepForPersonalInfo;

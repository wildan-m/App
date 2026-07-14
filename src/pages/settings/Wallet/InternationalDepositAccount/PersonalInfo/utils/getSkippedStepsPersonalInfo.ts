import {getCurrentAddress} from '@libs/PersonalDetailsUtils';

import {shouldShowInternationalBankAccountDetails} from '@pages/settings/Wallet/InternationalDepositAccount/utils';

import CONST from '@src/CONST';
import type {PersonalBankAccountForm} from '@src/types/form';
import type {PrivatePersonalDetails} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/**
 * Returns the substeps of the Personal Info step to skip, based on already existing data.
 *
 * The indexes are positions in the bodyContent array of PersonalInfo, where index 1 is the international bank account
 * details step and indexes 2-4 are the legal name, address and phone number steps.
 */
function getSkippedStepsPersonalInfo(
    data?: Partial<PrivatePersonalDetails>,
    personalBankAccountDraft?: OnyxEntry<PersonalBankAccountForm>,
    bankCountry?: string,
    reimbursementCountries?: string[],
): number[] {
    const currentAddress = getCurrentAddress(data);
    const skippedSteps = [];

    // The USD flow never collects a SWIFT/BIC code before this step, so it is always missing here.
    const shouldCollectInternationalBankAccountDetails = shouldShowInternationalBankAccountDetails(
        reimbursementCountries,
        bankCountry,
        CONST.BANK_ACCOUNT.REGEX.IBAN.test(personalBankAccountDraft?.accountNumber ?? ''),
        undefined,
    );

    if (!shouldCollectInternationalBankAccountDetails) {
        skippedSteps.push(1);
    }

    if (!!data?.legalFirstName && !!data?.legalLastName) {
        skippedSteps.push(2);
    }

    const isUsOrCanada = currentAddress?.country === CONST.COUNTRY.US || currentAddress?.country === CONST.COUNTRY.CA;
    const hasValidState = !isUsOrCanada || !!currentAddress?.state;

    if (!!currentAddress?.street && !!currentAddress?.city && hasValidState && !!currentAddress?.zip) {
        skippedSteps.push(3);
    }

    if (data?.phoneNumber) {
        skippedSteps.push(4);
    }

    return skippedSteps;
}

export default getSkippedStepsPersonalInfo;

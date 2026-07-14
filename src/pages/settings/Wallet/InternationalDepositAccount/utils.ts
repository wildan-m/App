import type {FormOnyxValues} from '@components/Form/types';
import type {LocaleContextProps} from '@components/LocaleContextProvider';

import {addErrorMessage} from '@libs/ErrorUtils';
import {getCurrentAddress} from '@libs/PersonalDetailsUtils';

import CONST from '@src/CONST';
import type ONYXKEYS from '@src/ONYXKEYS';
import type {InternationalBankAccountForm} from '@src/types/form';
import type {BankAccount, BankAccountList, CorpayFields, PrivatePersonalDetails} from '@src/types/onyx';
import type {CorpayFieldsMap} from '@src/types/onyx/CorpayFields';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import lodashSortBy from 'lodash/sortBy';

type InternationalBankAccountDetailsValues = {
    /** The IBAN of the bank account */
    iban?: string;

    /** The SWIFT/BIC code of the bank account */
    swiftCode?: string;
};

function getFieldsMap(corpayFields: OnyxEntry<CorpayFields>): Record<ValueOf<typeof CONST.CORPAY_FIELDS.PAGE_NAME>, CorpayFieldsMap> {
    return (corpayFields?.formFields ?? []).reduce(
        (acc, field) => {
            if (!field.id) {
                return acc;
            }
            if (field.id === CONST.CORPAY_FIELDS.ACCOUNT_TYPE_KEY) {
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_TYPE] = {[field.id]: field};
            } else if (CONST.CORPAY_FIELDS.ACCOUNT_HOLDER_FIELDS.includes(field.id)) {
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_HOLDER_DETAILS] = acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_HOLDER_DETAILS] ?? {};
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_HOLDER_DETAILS][field.id] = field;
            } else if (CONST.CORPAY_FIELDS.BANK_INFORMATION_FIELDS.includes(field.id)) {
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.BANK_INFORMATION] = acc[CONST.CORPAY_FIELDS.PAGE_NAME.BANK_INFORMATION] ?? {};
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.BANK_INFORMATION][field.id] = field;
            } else {
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_DETAILS] = acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_DETAILS] ?? {};
                acc[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_DETAILS][field.id] = field;
            }
            return acc;
        },
        {} as Record<ValueOf<typeof CONST.CORPAY_FIELDS.PAGE_NAME>, CorpayFieldsMap>,
    );
}

function getLatestCreatedBankAccount(bankAccountList: OnyxEntry<BankAccountList>): BankAccount | undefined {
    return lodashSortBy(Object.values(bankAccountList ?? {}), 'accountData.created').pop();
}

function getSubstepValues(
    privatePersonalDetails: OnyxEntry<PrivatePersonalDetails>,
    corpayFields: OnyxEntry<CorpayFields>,
    bankAccountList: OnyxEntry<BankAccountList>,
    internationalBankAccountDraft: OnyxEntry<InternationalBankAccountForm>,
    country: OnyxEntry<string>,
    fieldsMap: Record<ValueOf<typeof CONST.CORPAY_FIELDS.PAGE_NAME>, CorpayFieldsMap>,
): InternationalBankAccountForm {
    const address = getCurrentAddress(privatePersonalDetails);
    const personalDetailsFieldMap = fieldsMap[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_HOLDER_DETAILS];
    const {street} = address ?? {};
    const [street1, street2] = street ? street.split('\n') : [undefined, undefined];
    const firstName = privatePersonalDetails?.legalFirstName ?? '';
    const lastName = privatePersonalDetails?.legalLastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim() ? `${firstName} ${lastName}`.trim() : undefined;
    const latestBankAccount = getLatestCreatedBankAccount(bankAccountList);
    return {
        ...internationalBankAccountDraft,
        bankCountry: internationalBankAccountDraft?.bankCountry ?? corpayFields?.bankCountry ?? address?.country ?? latestBankAccount?.bankCountry ?? country ?? '',
        bankCurrency: internationalBankAccountDraft?.bankCurrency ?? corpayFields?.bankCurrency,
        accountHolderName: !isEmptyObject(personalDetailsFieldMap?.accountHolderName) ? (internationalBankAccountDraft?.accountHolderName ?? fullName) : undefined,
        accountHolderAddress1: !isEmptyObject(personalDetailsFieldMap?.accountHolderAddress1) ? (internationalBankAccountDraft?.accountHolderAddress1 ?? street1) : undefined,
        accountHolderAddress2: !isEmptyObject(personalDetailsFieldMap?.accountHolderAddress2) ? (internationalBankAccountDraft?.accountHolderAddress2 ?? street2) : undefined,
        accountHolderCity: !isEmptyObject(personalDetailsFieldMap?.accountHolderCity) ? (internationalBankAccountDraft?.accountHolderCity ?? address?.city) : undefined,
        accountHolderCountry: !isEmptyObject(personalDetailsFieldMap?.accountHolderCountry)
            ? (internationalBankAccountDraft?.accountHolderCountry ?? corpayFields?.bankCountry ?? address?.country ?? latestBankAccount?.bankCountry ?? country ?? '')
            : undefined,
        accountHolderPostal: !isEmptyObject(personalDetailsFieldMap?.accountHolderPostal) ? (internationalBankAccountDraft?.accountHolderPostal ?? address?.zip) : undefined,
        accountHolderPhoneNumber: !isEmptyObject(personalDetailsFieldMap?.accountHolderPhoneNumber)
            ? (internationalBankAccountDraft?.accountHolderPhoneNumber ?? privatePersonalDetails?.phoneNumber)
            : undefined,
    } as unknown as InternationalBankAccountForm;
}

function getInitialPersonalDetailsValues(privatePersonalDetails: OnyxEntry<PrivatePersonalDetails>): InternationalBankAccountForm {
    const address = getCurrentAddress(privatePersonalDetails);
    const {street} = address ?? {};
    const [street1, street2] = street ? street.split('\n') : [undefined, undefined];
    const firstName = privatePersonalDetails?.legalFirstName ?? '';
    const lastName = privatePersonalDetails?.legalLastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return {
        accountHolderName: fullName,
        accountHolderAddress1: street1 ?? '',
        accountHolderAddress2: street2 ?? '',
        accountHolderCity: address?.city ?? '',
        accountHolderCountry: address?.country ?? '',
        accountHolderPostal: address?.zip ?? '',
        accountHolderPhoneNumber: privatePersonalDetails?.phoneNumber ?? '',
    } as InternationalBankAccountForm;
}

function testValidation(values: InternationalBankAccountForm, fieldsMap: CorpayFieldsMap = {}) {
    for (const fieldName in fieldsMap) {
        if (!fieldName) {
            continue;
        }
        if (fieldsMap[fieldName].isRequired && (values[fieldName] ?? '') === '') {
            return false;
        }
        for (const rule of fieldsMap[fieldName].validationRules) {
            const regExpCheck = new RegExp(rule.regEx);
            if (!regExpCheck.test(values[fieldName] ?? '')) {
                return false;
            }
        }
    }
    return true;
}

/**
 * The international bank account details are only collected when the bank country is outside the countries the policy can
 * reimburse directly, and the account details the user already gave us don't cover them.
 *
 * Both arguments describing what we already have must come from the account details step only. Reading back the values this
 * step itself writes would make the step skip itself as soon as it is filled in, which would hide it from the back button.
 */
function shouldShowInternationalBankAccountDetails(
    reimbursementCountries: string[] | undefined,
    bankCountry: string | undefined,
    isAccountNumberAnIban: boolean,
    swiftCodeFromAccountDetails: string | undefined,
) {
    if (!bankCountry || (reimbursementCountries ?? []).length === 0 || reimbursementCountries?.includes(bankCountry)) {
        return false;
    }
    return !isAccountNumberAnIban || !swiftCodeFromAccountDetails;
}

/**
 * Whether any of the account details the Corpay rules asked for holds a value that is already an IBAN.
 */
function hasIbanInAccountDetails(values: InternationalBankAccountForm, accountDetailsFieldsMap: CorpayFieldsMap = {}) {
    return Object.keys(accountDetailsFieldsMap).some((fieldName) => CONST.BANK_ACCOUNT.REGEX.IBAN.test(values[fieldName] ?? ''));
}

/**
 * The SWIFT/BIC code the Corpay rules already collected on the account details step, if they asked for it at all.
 */
function getSwiftCodeFromAccountDetails(values: InternationalBankAccountForm, accountDetailsFieldsMap: CorpayFieldsMap = {}) {
    return CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.SWIFT_CODE in accountDetailsFieldsMap ? values[CONST.INTERNATIONAL_BANK_ACCOUNT_DETAILS.SWIFT_CODE] : undefined;
}

function hasValidInternationalBankAccountDetails(values: InternationalBankAccountDetailsValues) {
    return CONST.BANK_ACCOUNT.REGEX.IBAN.test(values.iban ?? '') && CONST.BANK_ACCOUNT.REGEX.SWIFT_CODE.test(values.swiftCode ?? '');
}

function getInternationalBankAccountDetailsErrors(values: InternationalBankAccountDetailsValues, translate: LocaleContextProps['translate']) {
    const errors: InternationalBankAccountDetailsValues = {};
    if (!CONST.BANK_ACCOUNT.REGEX.IBAN.test(values.iban ?? '')) {
        errors.iban = translate('addPersonalBankAccount.error.invalidSwiftCodeOrIban');
    }
    if (!CONST.BANK_ACCOUNT.REGEX.SWIFT_CODE.test(values.swiftCode ?? '')) {
        errors.swiftCode = translate('addPersonalBankAccount.error.invalidSwiftCodeOrIban');
    }
    return errors;
}

function getInitialSubstep(
    values: InternationalBankAccountForm,
    fieldsMap: Record<ValueOf<typeof CONST.CORPAY_FIELDS.PAGE_NAME>, CorpayFieldsMap>,
    shouldCollectInternationalBankAccountDetails = false,
) {
    if (values.bankCountry === '' || isEmptyObject(fieldsMap)) {
        return CONST.CORPAY_FIELDS.INDEXES.MAPPING.COUNTRY_SELECTOR;
    }
    if (values.bankCurrency === '' || !testValidation(values, fieldsMap[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_DETAILS])) {
        return CONST.CORPAY_FIELDS.INDEXES.MAPPING.BANK_ACCOUNT_DETAILS;
    }
    if (shouldCollectInternationalBankAccountDetails && !hasValidInternationalBankAccountDetails({iban: values.iban, swiftCode: values.swiftCode})) {
        return CONST.CORPAY_FIELDS.INDEXES.MAPPING.INTERNATIONAL_ACCOUNT_DETAILS;
    }
    if (!testValidation(values, fieldsMap[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_TYPE])) {
        return CONST.CORPAY_FIELDS.INDEXES.MAPPING.ACCOUNT_TYPE;
    }
    if (!testValidation(values, fieldsMap[CONST.CORPAY_FIELDS.PAGE_NAME.BANK_INFORMATION])) {
        return CONST.CORPAY_FIELDS.INDEXES.MAPPING.BANK_INFORMATION;
    }
    if (!testValidation(values, fieldsMap[CONST.CORPAY_FIELDS.PAGE_NAME.ACCOUNT_HOLDER_DETAILS])) {
        return CONST.CORPAY_FIELDS.INDEXES.MAPPING.ACCOUNT_HOLDER_INFORMATION;
    }
    return CONST.CORPAY_FIELDS.INDEXES.MAPPING.CONFIRMATION;
}

function getValidationErrors(values: FormOnyxValues<typeof ONYXKEYS.FORMS.INTERNATIONAL_BANK_ACCOUNT_FORM>, fieldsMap: CorpayFieldsMap, translate: LocaleContextProps['translate']) {
    const errors = {};
    for (const [fieldName, field] of Object.entries(fieldsMap)) {
        if (field.isRequired && values[fieldName] === '') {
            addErrorMessage(errors, fieldName, translate('common.error.fieldRequired'));
            continue;
        }
        for (const rule of field.validationRules) {
            const regExpCheck = new RegExp(rule.regEx);
            if (!regExpCheck.test(values[fieldName])) {
                addErrorMessage(errors, fieldName, rule.errorMessage);
            }
        }
    }
    return errors;
}

export {
    getFieldsMap,
    getSubstepValues,
    getInitialPersonalDetailsValues,
    getInitialSubstep,
    testValidation,
    getValidationErrors,
    shouldShowInternationalBankAccountDetails,
    hasIbanInAccountDetails,
    getSwiftCodeFromAccountDetails,
    hasValidInternationalBankAccountDetails,
    getInternationalBankAccountDetailsErrors,
};
export type {InternationalBankAccountDetailsValues};

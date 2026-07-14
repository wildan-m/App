import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import MultiSelectListItem from '@components/SelectionList/ListItem/MultiSelectListItem';
import type {ConfirmButtonOptions, ListItem, TextInputOptions} from '@components/SelectionList/types';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSearchResults from '@hooks/useSearchResults';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {getReimbursementCountryISOs} from '@libs/PolicyUtils';

import type {SettingsNavigatorParamList} from '@navigation/types';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';

import {setReimbursementCountries} from '@userActions/Policy/Policy';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React, {useState} from 'react';

type CountryItem = {
    /** The country ISO code, e.g. "US" */
    countryISO: string;

    /** The country's pretty name, e.g. "United States" */
    name: string;
};

type WorkspaceReimbursementCountrySelectorPageProps = WithPolicyAndFullscreenLoadingProps &
    PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.REIMBURSEMENT_COUNTRY_SELECTOR>;

function WorkspaceReimbursementCountrySelectorPage({policy, route}: WorkspaceReimbursementCountrySelectorPageProps) {
    const {translate, localeCompare} = useLocalize();
    const policyID = route.params.policyID;
    const [bankAccountList] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST);

    const currentCountries = policy?.reimbursement?.countries;

    // `policy.achAccount` does not carry the country itself, so the primary bank account's country is resolved
    // through the bank account list. This is the one country that must always stay selected.
    const policyBankAccountID = policy?.achAccount?.bankAccountID;
    const bankAccountCountry = policyBankAccountID ? bankAccountList?.[policyBankAccountID]?.accountData?.additionalData?.country : undefined;

    const [selectedCountryISOs, setSelectedCountryISOs] = useState<string[]>(() => {
        const countryISOs = getReimbursementCountryISOs(currentCountries);
        if (bankAccountCountry && !countryISOs.includes(bankAccountCountry)) {
            return [...countryISOs, bankAccountCountry];
        }
        return countryISOs;
    });

    const allCountries: CountryItem[] = Object.entries(CONST.ALL_COUNTRIES)
        .map(([countryISO, name]) => ({countryISO, name}))
        .sort((first, second) => localeCompare(first.name, second.name));

    const filterCountry = (country: CountryItem, query: string) => country.name.toLowerCase().includes(query.toLowerCase());
    const sortCountries = (countries: CountryItem[]) => countries;
    const [searchValue, setSearchValue, filteredCountries] = useSearchResults(allCountries, filterCountry, sortCountries);

    const listItems: ListItem[] = filteredCountries.map((country) => ({
        text: country.name,
        keyForList: country.countryISO,
        isSelected: selectedCountryISOs.includes(country.countryISO),
        // The country of the policy's own bank account can never be deselected.
        isDisabled: country.countryISO === bankAccountCountry,
    }));

    const toggleCountry = (item: ListItem) => {
        const countryISO = item.keyForList;
        if (!countryISO || countryISO === bankAccountCountry) {
            return;
        }
        setSelectedCountryISOs((previousCountryISOs) =>
            previousCountryISOs.includes(countryISO) ? previousCountryISOs.filter((selected) => selected !== countryISO) : [...previousCountryISOs, countryISO],
        );
    };

    const onConfirm = () => {
        setReimbursementCountries(policyID, selectedCountryISOs, currentCountries);
        Navigation.goBack();
    };

    const confirmButtonOptions: ConfirmButtonOptions<ListItem> = {
        showButton: true,
        text: translate('common.save'),
        onConfirm,
    };

    const textInputOptions: TextInputOptions = {
        label: translate('common.search'),
        value: searchValue,
        onChangeText: setSearchValue,
        headerMessage: filteredCountries.length === 0 && searchValue.length > 0 ? translate('common.noResultsFound') : undefined,
    };

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_WORKFLOWS_ENABLED}
            policyFeature={CONST.POLICY.POLICY_FEATURE.WORKFLOWS_PAYMENTS}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldEnableMaxHeight
                testID="WorkspaceReimbursementCountrySelectorPage"
            >
                <HeaderWithBackButton
                    title={translate('workflowsPage.businessBankAccountCountries')}
                    subtitle={policy?.name ?? ''}
                    onBackButtonPress={Navigation.goBack}
                />
                <SelectionList
                    data={listItems}
                    ListItem={MultiSelectListItem}
                    canSelectMultiple
                    onSelectRow={toggleCountry}
                    selectionButtonPosition={CONST.SELECTION_BUTTON_POSITION.RIGHT}
                    shouldHeaderBeInsideList
                    shouldSingleExecuteRowSelect
                    addBottomSafeAreaPadding
                    confirmButtonOptions={confirmButtonOptions}
                    shouldShowTextInput
                    textInputOptions={textInputOptions}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceReimbursementCountrySelectorPage.displayName = 'WorkspaceReimbursementCountrySelectorPage';

export default withPolicyAndFullscreenLoading(WorkspaceReimbursementCountrySelectorPage);

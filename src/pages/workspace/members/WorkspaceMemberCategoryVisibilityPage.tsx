import ActivityIndicator from '@components/ActivityIndicator';
import BlockingView from '@components/BlockingViews/BlockingView';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import SelectionList from '@components/SelectionList';
import MultiSelectListItem from '@components/SelectionList/ListItem/MultiSelectListItem';
import type {ListItem} from '@components/SelectionList/types';

import useConfirmModal from '@hooks/useConfirmModal';
import useInitialSelection from '@hooks/useInitialSelection';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import usePermissions from '@hooks/usePermissions';
import {usePersonalDetailsByLogins} from '@hooks/usePersonalDetailByLogin';
import usePolicyCategoryPickerCategories from '@hooks/usePolicyCategoryPickerCategories';
import useSearchResults from '@hooks/useSearchResults';
import useThemeStyles from '@hooks/useThemeStyles';

import {setPolicyMemberCategoryVisibility} from '@libs/actions/Policy/Category';
import {getDecodedCategoryName, getMemberVisibleCategoryNames} from '@libs/CategoryUtils';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {getMemberAccountIDsForWorkspace, isControlPolicy} from '@libs/PolicyUtils';
import moveInitialSelectionToTop from '@libs/SelectionListOrderUtils';
import {cancelSpan, endSpan} from '@libs/telemetry/activeSpans';
import tokenizedSearch from '@libs/tokenizedSearch';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';

import variables from '@styles/variables';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React, {useEffect, useState} from 'react';
import {View} from 'react-native';

type WorkspaceMemberCategoryVisibilityPageProps = Omit<WithPolicyAndFullscreenLoadingProps, 'route'> &
    PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.MEMBER_DETAILS_CATEGORY_VISIBILITY>;

type CategoryListItem = ListItem & {
    value: string;
};

function WorkspaceMemberCategoryVisibilityPage({policy, route}: WorkspaceMemberCategoryVisibilityPageProps) {
    const policyID = route.params.policyID;
    const accountID = Number(route.params.accountID);
    const styles = useThemeStyles();
    const {translate, localeCompare} = useLocalize();
    const {isBetaEnabled} = usePermissions();
    const {showConfirmModal} = useConfirmModal();
    const illustrations = useMemoizedLazyIllustrations(['Telescope']);

    const employeePersonalDetails = usePersonalDetailsByLogins(Object.keys(policy?.employeeList ?? {}));

    const {categories, policyCategories, isLoading: arePolicyCategoriesLoading} = usePolicyCategoryPickerCategories({policyID});

    const memberVisibleCategoryNames = getMemberVisibleCategoryNames(policyCategories, accountID);

    // The member's visible categories only settle once the categories load, so the selection starts undefined and
    // falls back to them; an unrestricted member starts with every category checked.
    const [selectedCategories, setSelectedCategories] = useState<string[] | undefined>(undefined);
    const selectedCategoryNames = selectedCategories ?? memberVisibleCategoryNames;
    const initialSelectedCategories = useInitialSelection(memberVisibleCategoryNames, {resetOnFocus: true});

    // The open span measures tap-to-list-render; end it on the first render with the list visible, and cancel it if
    // the admin leaves before then.
    useEffect(() => {
        if (arePolicyCategoriesLoading) {
            return;
        }
        endSpan(CONST.TELEMETRY.SPAN_OPEN_MEMBER_CATEGORY_VISIBILITY);
    }, [arePolicyCategoriesLoading]);
    useEffect(() => () => cancelSpan(CONST.TELEMETRY.SPAN_OPEN_MEMBER_CATEGORY_VISIBILITY), []);

    const categoryItems: CategoryListItem[] = categories.map((category) => ({
        keyForList: category.name,
        text: getDecodedCategoryName(category.name),
        value: category.name,
        isSelected: selectedCategoryNames.includes(category.name),
    }));

    // Tokenized like the main category picker, so the words can be typed in any order and a nested name is still found
    // by any part of it.
    const filterCategory = (item: CategoryListItem, searchInput: string) => tokenizedSearch([item], searchInput, (category) => [category.text ?? '']).length > 0;

    // Pin the initially visible categories to the top of the FULL sorted list, then let the search filter run over the
    // already-pinned list so pinned rows stay at the top even while searching.
    const sortedCategoryItems = moveInitialSelectionToTop(
        [...categoryItems].sort((a, b) => localeCompare(a.text ?? '', b.text ?? '')),
        initialSelectedCategories,
    );

    const [inputValue, setInputValue, filteredCategoryItems] = useSearchResults(sortedCategoryItems, filterCategory);

    const toggleCategory = (item: CategoryListItem) => {
        setSelectedCategories(
            selectedCategoryNames.includes(item.value) ? selectedCategoryNames.filter((categoryName) => categoryName !== item.value) : [...selectedCategoryNames, item.value],
        );
    };

    const toggleSelectAll = () => {
        const visibleValues = filteredCategoryItems.map((item) => item.value);
        const allVisibleSelected = visibleValues.length > 0 && visibleValues.every((value) => selectedCategoryNames.includes(value));

        if (allVisibleSelected) {
            const visibleSet = new Set(visibleValues);
            setSelectedCategories(selectedCategoryNames.filter((value) => !visibleSet.has(value)));
            return;
        }

        setSelectedCategories(Array.from(new Set([...selectedCategoryNames, ...visibleValues])));
    };

    const goBackToMemberDetails = () => Navigation.goBack(ROUTES.WORKSPACE_MEMBER_DETAILS.getRoute(policyID, accountID));

    const handleSave = () => {
        if (selectedCategoryNames.length === 0) {
            showConfirmModal({
                title: translate('workspace.people.membersMustHaveCategoryTitle'),
                prompt: translate('workspace.people.membersMustHaveCategoryDescription'),
                confirmText: translate('common.buttonConfirm'),
                shouldShowCancelButton: false,
            });
            return;
        }
        const policyMemberAccountIDs = Object.values(getMemberAccountIDsForWorkspace(policy?.employeeList, employeePersonalDetails));
        setPolicyMemberCategoryVisibility(policyID, [accountID], selectedCategoryNames, policyCategories ?? {}, policyMemberAccountIDs);
        goBackToMemberDetails();
    };

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            policyFeature={CONST.POLICY.POLICY_FEATURE.MEMBERS}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
            shouldBeBlocked={!isBetaEnabled(CONST.BETAS.CATEGORY_VISIBILITY) || !isControlPolicy(policy) || !policy?.areCategoriesEnabled}
        >
            <ScreenWrapper
                testID="WorkspaceMemberCategoryVisibilityPage"
                shouldEnableMaxHeight
                offlineIndicatorStyle={styles.mtAuto}
                includeSafeAreaPaddingBottom
            >
                <HeaderWithBackButtonAndTitle
                    title={translate('workspace.people.categoryVisibility')}
                    onBackButtonPress={goBackToMemberDetails}
                />
                {arePolicyCategoriesLoading ? (
                    <View style={[styles.flex1, styles.justifyContentCenter, styles.alignItemsCenter]}>
                        <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                    </View>
                ) : (
                    <SelectionList
                        canSelectMultiple
                        shouldUpdateFocusedIndex
                        ListItem={MultiSelectListItem}
                        data={filteredCategoryItems}
                        selectedItems={selectedCategoryNames}
                        shouldPreventDefaultFocusOnSelectRow={!canUseTouchScreen()}
                        onSelectRow={toggleCategory}
                        onSelectionButtonPress={toggleCategory}
                        onSelectAll={filteredCategoryItems.length > 0 ? toggleSelectAll : undefined}
                        textInputOptions={{
                            value: inputValue,
                            label: translate('common.search'),
                            onChangeText: setInputValue,
                        }}
                        style={{
                            listHeaderWrapperStyle: [styles.pt5, styles.pb2],
                            listHeaderSelectAllTextStyle: [styles.textLabelSupporting],
                        }}
                        listEmptyContent={
                            <ScrollView contentContainerStyle={[styles.flexGrow1]}>
                                <BlockingView
                                    icon={illustrations.Telescope}
                                    iconWidth={variables.emptyListIconWidth}
                                    iconHeight={variables.emptyListIconHeight}
                                    title={translate('common.noResultsFound')}
                                />
                            </ScrollView>
                        }
                        footerContent={
                            <FormAlertWithSubmitButton
                                buttonText={translate('common.save')}
                                isAlertVisible={false}
                                onSubmit={handleSave}
                                enabledWhenOffline
                                containerStyles={[styles.flexReset, styles.flexGrow0, styles.flexShrink0, styles.flexBasisAuto]}
                            />
                        }
                    />
                )}
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default withPolicyAndFullscreenLoading(WorkspaceMemberCategoryVisibilityPage);

import ConfirmationPage from '@components/ConfirmationPage';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';

import useDynamicBackPath from '@hooks/useDynamicBackPath';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearIssueNewCardFlow, setIssueNewCardStepAndData} from '@libs/actions/Card';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import type {SettingsNavigatorParamList} from '@navigation/types';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';

import CONST from '@src/CONST';
import ROUTES, {DYNAMIC_ROUTES} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import type {ValueOf} from 'type-fest';

import React, {useState} from 'react';
import {View} from 'react-native';

const REPLACE_OPTION = {
    YES: 'yes',
    NOT_NOW: 'notNow',
} as const;

type ReplaceOption = ValueOf<typeof REPLACE_OPTION>;

type WorkspaceCardReplaceDeactivatedPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.DYNAMIC_WORKSPACE_EXPENSIFY_CARD_REPLACE_DEACTIVATED>;

function WorkspaceCardReplaceDeactivatedPage({route}: WorkspaceCardReplaceDeactivatedPageProps) {
    const policyID = route.params.policyID;
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const backPath = useDynamicBackPath(DYNAMIC_ROUTES.WORKSPACE_EXPENSIFY_CARD_REPLACE_DEACTIVATED.path);
    const [selectedOption, setSelectedOption] = useState<ReplaceOption>(REPLACE_OPTION.YES);
    const [isSuccessVisible, setIsSuccessVisible] = useState(false);

    const goBackToCardList = () => {
        Navigation.goBack(backPath, {compareParams: false});
    };

    const confirm = () => {
        if (selectedOption === REPLACE_OPTION.YES) {
            setIssueNewCardStepAndData({policyID, step: CONST.EXPENSIFY_CARD.STEP.CONFIRMATION, isEditing: false, isChangeAssigneeDisabled: true});
            Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WORKSPACE_EXPENSIFY_CARD_ISSUE_NEW.path, ROUTES.WORKSPACE_EXPENSIFY_CARD.getRoute(policyID)));
            return;
        }
        clearIssueNewCardFlow(policyID);
        setIsSuccessVisible(true);
    };

    const options: Array<ListItem<ReplaceOption>> = [
        {
            text: translate('common.yes'),
            keyForList: REPLACE_OPTION.YES,
            isSelected: selectedOption === REPLACE_OPTION.YES,
        },
        {
            text: translate('common.notNow'),
            keyForList: REPLACE_OPTION.NOT_NOW,
            isSelected: selectedOption === REPLACE_OPTION.NOT_NOW,
        },
    ];

    const listHeader = (
        <View style={[styles.ph5, styles.mb5]}>
            <Text style={styles.textHeadlineH1}>{translate('workspace.card.replaceDeactivatedCard.title')}</Text>
        </View>
    );

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_EXPENSIFY_CARDS_ENABLED}
            policyFeature={CONST.POLICY.POLICY_FEATURE.EXPENSIFY_CARD}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
        >
            <ScreenWrapper
                testID="WorkspaceCardReplaceDeactivatedPage"
                includeSafeAreaPaddingBottom
                shouldEnableMaxHeight
            >
                {isSuccessVisible ? (
                    <ConfirmationPage
                        heading={translate('workspace.card.replaceDeactivatedCard.successTitle')}
                        description={translate('workspace.card.replaceDeactivatedCard.successDescription')}
                        shouldShowButton
                        buttonText={translate('common.buttonConfirm')}
                        onButtonPress={goBackToCardList}
                    />
                ) : (
                    <>
                        <HeaderWithBackButton
                            title={translate('workspace.card.deactivateCardModal.deactivateCard')}
                            onBackButtonPress={goBackToCardList}
                        />
                        <SelectionList
                            data={options}
                            ListItem={SingleSelectListItem}
                            onSelectRow={(option) => {
                                if (!option.keyForList) {
                                    return;
                                }
                                setSelectedOption(option.keyForList);
                            }}
                            customListHeader={listHeader}
                            confirmButtonOptions={{showButton: true, text: translate('common.next'), onConfirm: confirm}}
                            shouldUpdateFocusedIndex
                            initiallyFocusedItemKey={selectedOption}
                        />
                    </>
                )}
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceCardReplaceDeactivatedPage;

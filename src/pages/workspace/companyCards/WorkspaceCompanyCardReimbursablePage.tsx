import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import Text from '@components/Text';

import useCardFeeds from '@hooks/useCardFeeds';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import useWorkspaceAccountID from '@hooks/useWorkspaceAccountID';

import {setFeedForceReimbursable} from '@libs/actions/CompanyCards';
import {getCompanyCardFeed, getCompanyFeeds, getDomainOrWorkspaceAccountID, getFeedForceReimbursable, getSelectedFeed} from '@libs/CardUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React from 'react';

type WorkspaceCompanyCardReimbursablePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS_REIMBURSABLE>;

const FORCE_REIMBURSABLE_OPTIONS = [
    CONST.COMPANY_CARDS.FORCE_REIMBURSABLE.FORCE_YES,
    CONST.COMPANY_CARDS.FORCE_REIMBURSABLE.FORCE_NO,
    CONST.COMPANY_CARDS.FORCE_REIMBURSABLE.DEFAULT_YES,
    CONST.COMPANY_CARDS.FORCE_REIMBURSABLE.DEFAULT_NO,
] as const;

function WorkspaceCompanyCardReimbursablePage({
    route: {
        params: {policyID},
    },
}: WorkspaceCompanyCardReimbursablePageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [lastSelectedFeed, lastSelectedFeedResult] = useOnyx(`${ONYXKEYS.COLLECTION.LAST_SELECTED_FEED}${policyID}`);
    const [cardFeeds, cardFeedsResult] = useCardFeeds(policyID);
    const selectedFeed = getSelectedFeed(lastSelectedFeed, cardFeeds);
    const feed = selectedFeed ? getCompanyCardFeed(selectedFeed) : undefined;
    const workspaceAccountID = useWorkspaceAccountID(policyID);
    const companyFeeds = getCompanyFeeds(cardFeeds);
    const selectedFeedData = selectedFeed ? companyFeeds[selectedFeed] : undefined;
    const domainOrWorkspaceAccountID = getDomainOrWorkspaceAccountID(workspaceAccountID, selectedFeedData);
    const forceReimbursable = selectedFeedData?.forceReimbursable;
    const currentOption = getFeedForceReimbursable(forceReimbursable);

    const goBack = () => {
        Navigation.goBack(ROUTES.WORKSPACE_COMPANY_CARDS_SETTINGS.getRoute(policyID));
    };

    const options = FORCE_REIMBURSABLE_OPTIONS.map((option) => ({
        text: translate(`workspace.companyCards.forceReimbursable.${option}`),
        value: option,
        isSelected: currentOption === option,
        keyForList: option,
    }));

    if (isLoadingOnyxValue(cardFeedsResult) || isLoadingOnyxValue(lastSelectedFeedResult)) {
        return <FullScreenLoadingIndicator />;
    }

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_COMPANY_CARDS_ENABLED}
            policyFeature={CONST.POLICY.POLICY_FEATURE.COMPANY_CARDS}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
        >
            <ScreenWrapper
                testID="WorkspaceCompanyCardReimbursablePage"
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldEnableMaxHeight
            >
                <HeaderWithBackButton
                    title={translate('workspace.moreFeatures.companyCards.reimbursableTitle')}
                    onBackButtonPress={goBack}
                />
                <Text style={[styles.textNormal, styles.colorMuted, styles.mt3, styles.mh5, styles.mb5]}>{translate('workspace.moreFeatures.companyCards.reimbursableDescription')}</Text>
                <SelectionList
                    data={options}
                    ListItem={SingleSelectListItem}
                    onSelectRow={(item) => {
                        if (feed && item.value !== currentOption) {
                            setFeedForceReimbursable(policyID, feed, domainOrWorkspaceAccountID, item.value, forceReimbursable);
                        }
                        goBack();
                    }}
                    shouldSingleExecuteRowSelect
                    initiallyFocusedItemKey={currentOption}
                    addBottomSafeAreaPadding
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceCompanyCardReimbursablePage;

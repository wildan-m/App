import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';

import useCardFeeds from '@hooks/useCardFeeds';
import useCardsList from '@hooks/useCardsList';
import useLocalize from '@hooks/useLocalize';
import usePolicy from '@hooks/usePolicy';

import {getCompanyCardFeed, getCompanyFeeds, getDomainOrWorkspaceAccountID} from '@libs/CardUtils';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import Navigation from '@navigation/Navigation';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';

import {updateCardsTransactionStartDate} from '@userActions/CompanyCards';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {CompanyCardFeedWithDomainID} from '@src/types/onyx';

import React, {useMemo} from 'react';

import CompanyCardTransactionStartDateSelector from './CompanyCardTransactionStartDateSelector';

type WorkspaceCompanyCardsBulkTransactionStartDatePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.COMPANY_CARDS_BULK_TRANSACTION_START_DATE>;

function WorkspaceCompanyCardsBulkTransactionStartDatePage({route}: WorkspaceCompanyCardsBulkTransactionStartDatePageProps) {
    const {policyID} = route.params;
    const feedName = decodeURIComponent(route.params.feed) as CompanyCardFeedWithDomainID;
    const bank = getCompanyCardFeed(feedName);

    const {translate} = useLocalize();
    const policy = usePolicy(policyID);
    const workspaceAccountID = policy?.policyAccountID ?? CONST.DEFAULT_NUMBER_ID;

    const [cardFeeds] = useCardFeeds(policyID);
    const companyFeeds = getCompanyFeeds(cardFeeds);
    const domainOrWorkspaceAccountID = getDomainOrWorkspaceAccountID(workspaceAccountID, companyFeeds[feedName]);

    const cardIDs = useMemo(() => decodeURIComponent(route.params.cardIDs).split(',').filter(Boolean), [route.params.cardIDs]);

    const [allBankCards] = useCardsList(feedName);

    // The selected cards can each have a different start date, so there is no single value to prefill. We keep the
    // previous date per card only so the failure update can put each card back the way it was.
    const previousStartDates = useMemo(() => {
        const startDates: Record<string, string | undefined> = {};
        for (const cardID of cardIDs) {
            startDates[cardID] = allBankCards?.[cardID]?.scrapeMinDate;
        }
        return startDates;
    }, [allBankCards, cardIDs]);

    const submit = (newStartDate: string) => {
        updateCardsTransactionStartDate(domainOrWorkspaceAccountID, cardIDs, newStartDate, bank, previousStartDates);
        Navigation.navigate(ROUTES.WORKSPACE_COMPANY_CARDS_BULK_TRANSACTION_START_DATE_SUCCESS.getRoute(policyID, feedName));
    };

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_COMPANY_CARDS_ENABLED}
            policyFeature={CONST.POLICY.POLICY_FEATURE.COMPANY_CARDS}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
        >
            <ScreenWrapper
                testID="WorkspaceCompanyCardsBulkTransactionStartDatePage"
                enableEdgeToEdgeBottomSafeAreaPadding
            >
                <HeaderWithBackButton
                    title={translate('workspace.moreFeatures.companyCards.transactionStartDate')}
                    onBackButtonPress={() => Navigation.goBack()}
                />
                <CompanyCardTransactionStartDateSelector
                    description={translate('workspace.companyCards.bulkEditStartDateDescription')}
                    onSubmit={submit}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceCompanyCardsBulkTransactionStartDatePage;

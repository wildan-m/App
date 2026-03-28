import {useCallback} from 'react';
import {getCardFeedWithDomainID, getCompanyCardFeed, getCompanyFeeds, getDomainOrWorkspaceAccountID} from '@libs/CardUtils';
import {updateWorkspaceCompanyCard} from '@userActions/CompanyCards';
import CONST from '@src/CONST';
import type {CompanyCardFeedWithDomainID} from '@src/types/onyx';
import useCardFeedErrors from './useCardFeedErrors';
import useCardFeeds from './useCardFeeds';
import usePolicy from './usePolicy';

export default function useUpdateFeedBrokenConnection({policyID, feed}: {policyID?: string; feed?: CompanyCardFeedWithDomainID}) {
    const policy = usePolicy(policyID);
    const [cardFeeds] = useCardFeeds(policyID);
    const companyFeeds = getCompanyFeeds(cardFeeds);
    const workspaceAccountID = policy?.workspaceAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const domainOrWorkspaceAccountID = feed ? getDomainOrWorkspaceAccountID(workspaceAccountID, companyFeeds[feed]) : CONST.DEFAULT_NUMBER_ID;
    const cardFeedErrorsData = useCardFeedErrors();
    const {cardsWithBrokenFeedConnection} = cardFeedErrorsData;
    const isFeedConnectionBroken = feed ? (cardFeedErrorsData.cardFeedErrors[feed]?.isFeedConnectionBroken ?? false) : cardFeedErrorsData.all.isFeedConnectionBroken;

    const feedBrokenCards = feed
        ? Object.entries(cardsWithBrokenFeedConnection).filter(([, card]) => getCardFeedWithDomainID(card.bank, Number(card.fundID)) === feed)
        : Object.entries(cardsWithBrokenFeedConnection);
    const [brokenCardId, firstCardWithBrokenFeedConnection] = feedBrokenCards.at(0) ?? [];

    const updateBrokenConnection = useCallback(() => {
        if (!brokenCardId || !feed) {
            return;
        }
        updateWorkspaceCompanyCard(domainOrWorkspaceAccountID, brokenCardId, getCompanyCardFeed(feed), firstCardWithBrokenFeedConnection?.lastScrapeResult);
    }, [firstCardWithBrokenFeedConnection?.lastScrapeResult, brokenCardId, domainOrWorkspaceAccountID, feed]);

    return {updateBrokenConnection, isFeedConnectionBroken};
}

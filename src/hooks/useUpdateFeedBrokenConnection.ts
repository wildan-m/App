import {getCardFeedWithDomainID, getCompanyCardFeed, getCompanyFeeds, getDomainOrWorkspaceAccountID} from '@libs/CardUtils';

import {updateWorkspaceCompanyCard} from '@userActions/CompanyCards';

import CONST from '@src/CONST';
import type {Card, CompanyCardFeedWithDomainID} from '@src/types/onyx';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import {useCallback, useEffect, useMemo, useRef} from 'react';

import useCardFeedErrors from './useCardFeedErrors';
import useCardFeeds from './useCardFeeds';
import usePolicy from './usePolicy';

export default function useUpdateFeedBrokenConnection({policyID, feed}: {policyID?: string; feed?: CompanyCardFeedWithDomainID}) {
    const policy = usePolicy(policyID);
    const [cardFeeds] = useCardFeeds(policyID);
    const companyFeeds = getCompanyFeeds(cardFeeds);
    const workspaceAccountID = policy?.policyAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const domainOrWorkspaceAccountID = feed ? getDomainOrWorkspaceAccountID(workspaceAccountID, companyFeeds[feed]) : CONST.DEFAULT_NUMBER_ID;
    const {cardFeedErrors, cardsWithBrokenFeedConnection} = useCardFeedErrors();

    const isFeedConnectionBroken = feed ? !!cardFeedErrors[feed]?.isFeedConnectionBroken : false;

    const brokenCards = useMemo(() => {
        if (!feed) {
            return {};
        }
        return Object.fromEntries(Object.entries(cardsWithBrokenFeedConnection).filter(([, card]) => !!card.fundID && getCardFeedWithDomainID(card.bank, card.fundID) === feed));
    }, [cardsWithBrokenFeedConnection, feed]);

    // Once the bank connection is repaired, these cards drop out of the derived map and their
    // pre-repair lastScrapeResult is gone. updateBrokenConnection runs *after* that flip, so hold
    // on to the last known broken cards to keep driving the follow-up sync from them.
    const brokenCardsRef = useRef<Record<string, Card>>(brokenCards);
    useEffect(() => {
        if (isEmptyObject(brokenCards)) {
            return;
        }
        brokenCardsRef.current = brokenCards;
    }, [brokenCards]);

    const updateBrokenConnection = useCallback(() => {
        if (!feed) {
            return;
        }
        const bankName = getCompanyCardFeed(feed);
        for (const [brokenCardId, card] of Object.entries(brokenCardsRef.current)) {
            updateWorkspaceCompanyCard(domainOrWorkspaceAccountID, brokenCardId, bankName, card.lastScrapeResult);
        }
    }, [domainOrWorkspaceAccountID, feed]);

    return {updateBrokenConnection, isFeedConnectionBroken};
}

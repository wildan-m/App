/* eslint-disable @typescript-eslint/naming-convention */
import {renderHook} from '@testing-library/react-native';
import useCardFeedErrors from '@hooks/useCardFeedErrors';
import useCardFeeds from '@hooks/useCardFeeds';
import useUpdateFeedBrokenConnection from '@hooks/useUpdateFeedBrokenConnection';
import usePolicy from '@hooks/usePolicy';
import {getCardFeedWithDomainID} from '@libs/CardUtils';
import CONST from '@src/CONST';
import type {CompanyCardFeedWithDomainID} from '@src/types/onyx/CardFeeds';
import type {CardFeedErrors} from '@src/types/onyx/DerivedValues';

const workspaceAccountID = 11111111;

const feedA: CompanyCardFeedWithDomainID = getCardFeedWithDomainID(CONST.COMPANY_CARD.FEED_BANK_NAME.VISA, workspaceAccountID) as CompanyCardFeedWithDomainID;
const feedB: CompanyCardFeedWithDomainID = getCardFeedWithDomainID(CONST.COMPANY_CARD.FEED_BANK_NAME.MASTER_CARD, workspaceAccountID) as CompanyCardFeedWithDomainID;

const DEFAULT_FEED_ERROR_STATE = {
    shouldShowRBR: false,
    isFeedConnectionBroken: false,
    hasFeedErrors: false,
    hasWorkspaceErrors: false,
};

function makeFeedErrors(overrides: Partial<CardFeedErrors> = {}): CardFeedErrors {
    return {
        cardFeedErrors: {},
        cardsWithBrokenFeedConnection: {},
        personalCardsWithBrokenConnection: {},
        shouldShowRbrForWorkspaceAccountID: {},
        shouldShowRbrForFeedNameWithDomainID: {},
        all: DEFAULT_FEED_ERROR_STATE,
        companyCards: DEFAULT_FEED_ERROR_STATE,
        expensifyCard: DEFAULT_FEED_ERROR_STATE,
        personalCard: DEFAULT_FEED_ERROR_STATE,
        ...overrides,
    };
}

jest.mock('@hooks/useCardFeedErrors', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@hooks/useCardFeeds', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@hooks/usePolicy', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@userActions/CompanyCards', () => ({
    updateWorkspaceCompanyCard: jest.fn(),
}));

describe('useUpdateFeedBrokenConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (usePolicy as jest.Mock).mockReturnValue({workspaceAccountID});
        (useCardFeeds as jest.Mock).mockReturnValue([
            {
                [feedA]: {domainID: workspaceAccountID, liabilityType: 'personal', pending: false, feed: CONST.COMPANY_CARD.FEED_BANK_NAME.VISA},
                [feedB]: {domainID: workspaceAccountID, liabilityType: 'personal', pending: false, feed: CONST.COMPANY_CARD.FEED_BANK_NAME.MASTER_CARD},
            },
            {status: 'loaded'},
        ]);
    });

    it('returns isFeedConnectionBroken=false for the current feed when only a different feed is broken', () => {
        // feedB is broken globally (all.isFeedConnectionBroken = true), but feedA is healthy
        (useCardFeedErrors as jest.Mock).mockReturnValue(
            makeFeedErrors({
                all: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                cardFeedErrors: {
                    [feedA]: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: false},
                    [feedB]: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                },
            }),
        );

        const {result} = renderHook(() => useUpdateFeedBrokenConnection({policyID: 'policy1', feed: feedA}));
        expect(result.current.isFeedConnectionBroken).toBe(false);
    });

    it('returns isFeedConnectionBroken=true when the current feed itself is broken', () => {
        (useCardFeedErrors as jest.Mock).mockReturnValue(
            makeFeedErrors({
                all: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                cardFeedErrors: {
                    [feedA]: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                },
            }),
        );

        const {result} = renderHook(() => useUpdateFeedBrokenConnection({policyID: 'policy1', feed: feedA}));
        expect(result.current.isFeedConnectionBroken).toBe(true);
    });

    it('falls back to all.isFeedConnectionBroken when feed is undefined', () => {
        (useCardFeedErrors as jest.Mock).mockReturnValue(
            makeFeedErrors({
                all: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
            }),
        );

        const {result} = renderHook(() => useUpdateFeedBrokenConnection({policyID: 'policy1', feed: undefined}));
        expect(result.current.isFeedConnectionBroken).toBe(true);
    });

    it('updateBrokenConnection only targets cards from the current feed, not cards from other feeds', () => {
        const {updateWorkspaceCompanyCard} = jest.requireMock('@userActions/CompanyCards');

        const cardFromFeedA = {
            cardID: 1,
            bank: CONST.COMPANY_CARD.FEED_BANK_NAME.VISA,
            fundID: String(workspaceAccountID),
            lastScrapeResult: 7,
            accountID: 0,
            cardName: '',
            domainName: '',
            fraud: 'none' as const,
            lastFourPAN: '1234',
            lastScrape: '',
            lastUpdated: '',
            state: CONST.EXPENSIFY_CARD.STATE.OPEN,
        };
        const cardFromFeedB = {
            cardID: 2,
            bank: CONST.COMPANY_CARD.FEED_BANK_NAME.MASTER_CARD,
            fundID: String(workspaceAccountID),
            lastScrapeResult: 7,
            accountID: 0,
            cardName: '',
            domainName: '',
            fraud: 'none' as const,
            lastFourPAN: '5678',
            lastScrape: '',
            lastUpdated: '',
            state: CONST.EXPENSIFY_CARD.STATE.OPEN,
        };

        (useCardFeedErrors as jest.Mock).mockReturnValue(
            makeFeedErrors({
                all: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                cardFeedErrors: {
                    [feedA]: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                    [feedB]: {...DEFAULT_FEED_ERROR_STATE, isFeedConnectionBroken: true},
                },
                // Both feeds have broken cards, but feedB card comes first
                cardsWithBrokenFeedConnection: {
                    '2': cardFromFeedB,
                    '1': cardFromFeedA,
                },
            }),
        );

        const {result} = renderHook(() => useUpdateFeedBrokenConnection({policyID: 'policy1', feed: feedA}));
        result.current.updateBrokenConnection();

        // Should have called with card from feedA (cardID=1), NOT feedB (cardID=2)
        expect(updateWorkspaceCompanyCard).toHaveBeenCalledTimes(1);
        const [, calledCardId] = updateWorkspaceCompanyCard.mock.calls[0] as [unknown, string, ...unknown[]];
        expect(calledCardId).toBe('1');
    });
});

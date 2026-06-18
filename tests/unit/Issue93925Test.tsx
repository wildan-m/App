/* eslint-disable @typescript-eslint/naming-convention */
import {renderHook} from '@testing-library/react-native';
import type {OnyxCollection} from 'react-native-onyx';
import useCardFeedErrors from '@hooks/useCardFeedErrors';
import useCardFeedsForActivePolicies from '@hooks/useCardFeedsForActivePolicies';
import {useCompanyCardFeedIcons} from '@hooks/useCompanyCardIcons';
import useCompanyCards from '@hooks/useCompanyCards';
import useLocalize from '@hooks/useLocalize';
import useOtherFeedsForFeedSelector from '@hooks/useOtherFeedsForFeedSelector';
import useThemeIllustrations from '@hooks/useThemeIllustrations';
import useThemeStyles from '@hooks/useThemeStyles';
import {getCardFeedsForDisplayPerPolicy} from '@libs/CardFeedUtils';
import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {CardFeeds, CompanyCardFeed, Domain} from '@src/types/onyx';
import {translateLocal} from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

/**
 * Regression tests for https://github.com/Expensify/App/issues/93925
 *
 * Domain card feeds were shown duplicated (once per workspace a feed was shared to) and some
 * domain feeds were missing entirely from the card feed selector. The fix enumerates each feed
 * once and gates visibility on the user's domain/workspace-admin standing.
 */

const cardFeedVisaMock: CompanyCardFeed = CONST.COMPANY_CARD.FEED_BANK_NAME.VISA;
const currentPolicyID = 'policy_current';

describe('Issue 93925 — getCardFeedsForDisplayPerPolicy', () => {
    const currentUserAccountID = 555;
    const fundID = 4321;

    beforeAll(() => {
        IntlStore.load(CONST.LOCALES.EN);
        return waitForBatchedUpdates();
    });

    it('surfaces a domain feed with no linkedPolicyIDs to a domain admin (previously missing)', () => {
        const orphanDomainFeed: OnyxCollection<CardFeeds> = {
            [`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${fundID}`]: {
                settings: {
                    companyCardNicknames: {},
                    companyCards: {
                        // No linkedPolicyIDs and no preferredPolicy — the orphan case that used to be dropped.
                        [cardFeedVisaMock]: {},
                    },
                },
            },
        };
        const domains: OnyxCollection<Domain> = {
            [`${ONYXKEYS.COLLECTION.DOMAIN}${fundID}`]: {
                validated: true,
                accountID: fundID,
                email: '+@company.com',
                // Backend-provided keys; current user is a domain admin of this fund.
                domain_defaultSecurityGroupID: '0',
                expensify_adminPermissions_0: currentUserAccountID,
            },
        };

        const result = getCardFeedsForDisplayPerPolicy(orphanDomainFeed, translateLocal, undefined, undefined, domains, currentUserAccountID);

        // The feed appears exactly once, keyed by its fund, instead of being lost in an empty bucket.
        expect(result[`${fundID}`]).toHaveLength(1);
        expect(result[`${fundID}`]?.at(0)?.id).toBe(`${fundID}_vcf`);
        expect(result['']).toBeUndefined();
    });
});

const mockUseOnyx = jest.fn();

jest.mock('@hooks/useOnyx', () => ({
    __esModule: true,
    default: (...args: unknown[]): [unknown, {status?: string}] => mockUseOnyx(...args) as [unknown, {status?: string}],
}));
jest.mock('@hooks/useCardFeedsForActivePolicies', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@hooks/useCompanyCards', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@hooks/useCardFeedErrors', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@hooks/useLocalize', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@hooks/useThemeStyles', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@hooks/useThemeIllustrations', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@hooks/useCompanyCardIcons', () => ({__esModule: true, useCompanyCardFeedIcons: jest.fn()}));

describe('Issue 93925 — useOtherFeedsForFeedSelector dedupe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseOnyx.mockImplementation((key: string) => {
            if (key === ONYXKEYS.COLLECTION.DOMAIN) {
                return [{}, {status: 'loaded'}];
            }
            if (key === ONYXKEYS.COLLECTION.POLICY) {
                return [{}, {status: 'loaded'}];
            }
            return [undefined, {}];
        });
        (useLocalize as jest.Mock).mockReturnValue({translate: (phrase: string) => phrase});
        (useThemeStyles as jest.Mock).mockReturnValue({mr3: {marginRight: 12}, cardIcon: {}});
        (useThemeIllustrations as jest.Mock).mockReturnValue({});
        (useCompanyCardFeedIcons as jest.Mock).mockReturnValue({});
        (useCardFeedErrors as jest.Mock).mockReturnValue({shouldShowRbrForFeedNameWithDomainID: {}});
        (useCompanyCards as jest.Mock).mockReturnValue({feedName: undefined});
        (useCardFeedsForActivePolicies as jest.Mock).mockReturnValue({cardFeedsByPolicy: {}});
    });

    it('renders a feed shared to multiple workspaces only once (previously duplicated)', () => {
        // A single feed indexed under two policy buckets, as happens when it is linked to multiple workspaces.
        const sharedFeed = {
            id: '999_oauth.chase.com',
            feed: 'oauth.chase.com',
            fundID: '999',
            name: 'Chase feed',
            linkedPolicyIDs: ['policy_a', 'policy_b'],
            country: 'US',
        };
        (useCardFeedsForActivePolicies as jest.Mock).mockReturnValue({
            cardFeedsByPolicy: {
                policy_a: [sharedFeed],
                policy_b: [sharedFeed],
            },
        });

        const {result} = renderHook(() => useOtherFeedsForFeedSelector(currentPolicyID));

        // Before the fix this returned two identical rows (one per bucket); now it is deduped to one.
        expect(result.current).toHaveLength(1);
        expect(result.current.at(0)?.keyForList).toBe('999_oauth.chase.com');
    });
});

import {getDefaultCardFeed} from '@hooks/useCardFeedsForDisplay';

import type {CardFeedForDisplay} from '@libs/CardFeedUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import createRandomPolicy from '../utils/collections/policies';

const localeCompare = (a: string, b: string) => a.localeCompare(b);

const customFeedA: CardFeedForDisplay = {id: '1_vcf', feed: 'vcf', fundID: '1', name: 'Alpha Visa'};
const customFeedB: CardFeedForDisplay = {id: '1_cdf', feed: 'cdf', fundID: '1', name: 'Beta MasterCard'};
const commercialFeed: CardFeedForDisplay = {id: '2_oauth.chase.com', feed: 'oauth.chase.com' as CardFeedForDisplay['feed'], fundID: '2', name: 'Chase'};
const commercialFeedZ: CardFeedForDisplay = {id: '3_stripe', feed: 'stripe' as CardFeedForDisplay['feed'], fundID: '3', name: 'Stripe'};

const regionsBankFeed: CardFeedForDisplay = {id: '9_vcf', feed: 'vcf', fundID: '9', name: 'Regions Bank'};
const expensifyCardFeed: CardFeedForDisplay = {id: '5_Expensify Card', feed: 'Expensify Card' as CardFeedForDisplay['feed'], fundID: '5', name: 'Expensify Card'};

/** Builds a policy collection keyed by policy ID, where each policy owns the fund identified by its policyAccountID. */
const buildPolicies = (policiesByID: Record<string, number>): OnyxCollection<Policy> =>
    Object.fromEntries(
        Object.entries(policiesByID).map(([policyID, policyAccountID], index) => [`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {...createRandomPolicy(index), id: policyID, policyAccountID}]),
    );

describe('getDefaultCardFeed', () => {
    it('returns the alphabetically first feed from the active policy when it is eligible', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [customFeedB, customFeedA],
        };
        const result = getDefaultCardFeed(['POLICY_1'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedA);
    });

    it('falls back to the first eligible policy with feeds when the active policy has none', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_2: [customFeedB, customFeedA],
        };
        const result = getDefaultCardFeed(['POLICY_1', 'POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedA);
    });

    it('falls back to commercial feeds when no eligible policy has feeds', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '': [commercialFeedZ, commercialFeed],
        };
        const result = getDefaultCardFeed(['POLICY_1'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(commercialFeed);
    });

    it('skips the active policy when it is not eligible and uses the first eligible policy instead', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [customFeedB],
            POLICY_2: [customFeedA],
        };
        // POLICY_1 is active but not in the eligible list
        const result = getDefaultCardFeed(['POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedA);
    });

    it('returns undefined when there are no feeds at all', () => {
        const result = getDefaultCardFeed([], undefined, {}, localeCompare);
        expect(result).toBeUndefined();
    });

    it('returns undefined when eligiblePoliciesIDsArray is undefined', () => {
        const result = getDefaultCardFeed(undefined, undefined, {}, localeCompare);
        expect(result).toBeUndefined();
    });

    it('prefers active policy feed over other eligible policies', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [customFeedB],
            POLICY_2: [customFeedA],
        };
        const result = getDefaultCardFeed(['POLICY_1', 'POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedB);
    });

    it("prefers the active policy's Expensify Card feed over another policy's company feed", () => {
        // The active workspace owns only an Expensify Card feed (fundID 5); an unrelated workspace carries Regions Bank.
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_2: [regionsBankFeed],
        };
        const policies = buildPolicies({POLICY_1: 5, POLICY_2: 9});
        const result = getDefaultCardFeed(['POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare, expensifyCardFeed, policies);
        expect(result).toEqual(expensifyCardFeed);
    });

    it('ignores an Expensify Card feed owned by a policy other than the active one', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [regionsBankFeed],
        };
        // The Expensify Card feed belongs to POLICY_2 (fundID 5), so the active policy's own company feed wins.
        const policies = buildPolicies({POLICY_1: 9, POLICY_2: 5});
        const result = getDefaultCardFeed(['POLICY_1'], 'POLICY_1', cardFeedsByPolicy, localeCompare, expensifyCardFeed, policies);
        expect(result).toEqual(regionsBankFeed);
    });

    it('falls back to the Expensify Card feed when no company feed exists anywhere', () => {
        const policies = buildPolicies({POLICY_1: 9});
        const result = getDefaultCardFeed(['POLICY_1'], 'POLICY_1', {}, localeCompare, expensifyCardFeed, policies);
        expect(result).toEqual(expensifyCardFeed);
    });
});

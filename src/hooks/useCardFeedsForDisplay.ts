import type {CardFeedForDisplay} from '@libs/CardFeedUtils';
import {getCardFeedsForDisplayPerPolicy} from '@libs/CardFeedUtils';
import {isCustomFeed} from '@libs/CardUtils';
import {isPaidGroupPolicy} from '@libs/PolicyUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type {CardFeedWithNumber} from '@src/types/onyx/CardFeeds';

import type {OnyxCollection} from 'react-native-onyx';

import {defaultExpensifyCardSelector} from '@selectors/Card';

import useFeedKeysWithAssignedCards from './useFeedKeysWithAssignedCards';
import useLocalize from './useLocalize';
import useOnyx from './useOnyx';

const eligiblePoliciesSelector = (policies: OnyxCollection<Policy>): string[] => {
    return Object.values(policies ?? {}).reduce((policiesIDs, policy) => {
        if (isPaidGroupPolicy(policy) && policy?.areCompanyCardsEnabled && policy?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
            policiesIDs.push(policy.id);
        }
        return policiesIDs;
    }, [] as string[]);
};

function getDefaultCardFeed(
    eligiblePoliciesIDsArray: string[] | undefined,
    activePolicyID: string | undefined,
    cardFeedsByPolicy: Record<string, CardFeedForDisplay[]>,
    localeCompare: (a: string, b: string) => number,
    expensifyCardFeed?: CardFeedForDisplay,
    policies?: OnyxCollection<Policy>,
): CardFeedForDisplay | undefined {
    const eligiblePoliciesIDs = new Set(eligiblePoliciesIDsArray);

    // Prioritize the active policy. Its Expensify Card feed is a peer of its company feeds here: `cardFeedsByPolicy`
    // only ever holds company feeds, and `eligiblePoliciesIDs` gates company cards alone, so neither may hide the
    // active workspace's own Expensify Card feed. A feed belongs to the workspace whose policyAccountID is its fundID.
    if (activePolicyID) {
        const activePolicyCompanyFeeds = eligiblePoliciesIDs.has(activePolicyID) ? (cardFeedsByPolicy[activePolicyID] ?? []) : [];
        const activePolicy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`];
        const activePolicyExpensifyCardFeed = expensifyCardFeed && activePolicy?.policyAccountID === Number(expensifyCardFeed.fundID) ? expensifyCardFeed : undefined;
        const activePolicyCardFeeds = activePolicyExpensifyCardFeed ? [...activePolicyCompanyFeeds, activePolicyExpensifyCardFeed] : activePolicyCompanyFeeds;

        if (activePolicyCardFeeds.length) {
            return [...activePolicyCardFeeds].sort((a, b) => localeCompare(a.name, b.name)).at(0);
        }
    }

    // If the active policy doesn't have card feeds, use the first eligible policy that does
    for (const eligiblePolicyID of eligiblePoliciesIDs) {
        const policyCardFeeds = cardFeedsByPolicy[eligiblePolicyID];
        if (policyCardFeeds?.length) {
            return [...policyCardFeeds].sort((a, b) => localeCompare(a.name, b.name)).at(0);
        }
    }

    // Commercial feeds don't have preferred policies, so we need to include these in the list
    const commercialFeeds = Object.values(cardFeedsByPolicy)
        .flat()
        .filter((feed) => !isCustomFeed(feed.name as CardFeedWithNumber));

    // The Expensify Card feed stays the last resort, so accounts without any company card feed keep defaulting to it.
    return commercialFeeds.sort((a, b) => localeCompare(a.name, b.name)).at(0) ?? expensifyCardFeed;
}

const useCardFeedsForDisplay = () => {
    const {localeCompare, translate} = useLocalize();
    const [allFeeds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const feedKeysWithCards = useFeedKeysWithAssignedCards();
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [defaultExpensifyCard] = useOnyx(ONYXKEYS.DERIVED.NON_PERSONAL_AND_WORKSPACE_CARD_LIST, {selector: defaultExpensifyCardSelector});
    const eligiblePoliciesIDsArray = eligiblePoliciesSelector(allPolicies);

    const cardFeedsByPolicy = getCardFeedsForDisplayPerPolicy(allFeeds, translate, feedKeysWithCards, allPolicies);

    const defaultCardFeed = getDefaultCardFeed(eligiblePoliciesIDsArray, activePolicyID, cardFeedsByPolicy, localeCompare, defaultExpensifyCard, allPolicies);

    return {defaultCardFeed, cardFeedsByPolicy};
};

export default useCardFeedsForDisplay;
export {getDefaultCardFeed};

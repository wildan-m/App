import {getCardFeedsForDisplayPerPolicy} from '@libs/CardFeedUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useFeedKeysWithAssignedCards from './useFeedKeysWithAssignedCards';
import useLocalize from './useLocalize';
import useOnyx from './useOnyx';

const useCardFeedsForActivePolicies = () => {
    const {translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const [allFeeds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [allDomains] = useOnyx(ONYXKEYS.COLLECTION.DOMAIN);
    const feedKeysWithCards = useFeedKeysWithAssignedCards();

    // Enumerate each feed once, gated by the user's domain/workspace-admin status inside
    // getCardFeedsForDisplayPerPolicy. No eligible-policy filter here: it used to drop the
    // non-linked bucket, hiding domain feeds that aren't tied to one of the user's active policies.
    const cardFeedsByPolicy = getCardFeedsForDisplayPerPolicy(allFeeds, translate, feedKeysWithCards, allPolicies, allDomains, currentUserAccountID);

    return {cardFeedsByPolicy};
};

export default useCardFeedsForActivePolicies;

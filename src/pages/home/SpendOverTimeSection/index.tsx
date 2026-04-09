import React from 'react';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import {getSuggestedSearches, isPolicyEligibleForSpendOverTime} from '@libs/SearchUIUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SpendOverTimeSectionContent from './SpendOverTimeSectionContent';

function SpendOverTimeSection() {
    const {login} = useCurrentUserPersonalDetails();
    const [isAnyPolicyEligibleForSpendOverTime] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {
        selector: (policies) => Object.values(policies ?? {}).some((policy) => !!policy && isPolicyEligibleForSpendOverTime(policy, login)),
    });
    const [hasTransactions] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION, {
        selector: (transactions) => Object.keys(transactions ?? {}).length > 0,
    });

    // Read the cached search snapshot from a previous fetch. It lets us decide synchronously,
    // before mounting the content, whether the widget will end up having enough data points
    // to display — which in turn lets us avoid both the loader-flicker (if we would show a
    // loader and then hide) and the layout-shift (if we would hide during loading and then
    // reveal the widget once data arrives).
    const spendOverTimeQueryHash = getSuggestedSearches()[CONST.SEARCH.SEARCH_KEYS.SPEND_OVER_TIME]?.searchQueryJSON?.hash ?? 0;
    const [cachedMonthGroupCount] = useOnyx<`snapshot_${number}`, number | undefined>(`${ONYXKEYS.COLLECTION.SNAPSHOT}${spendOverTimeQueryHash}`, {
        selector: (snapshot) => (snapshot?.data ? Object.keys(snapshot.data).filter((key) => key.startsWith(CONST.SEARCH.GROUP_PREFIX)).length : undefined),
    });

    // The widget is only shown for workspace admins/auditors/approvers.
    // If there are no transactions (e.g. a brand new account) we expect the Search results to be empty,
    // so we don't show the section to avoid briefly displaying a loading widget that disappears once the empty results load.
    if (!isAnyPolicyEligibleForSpendOverTime || !hasTransactions) {
        return null;
    }

    // If a previous fetch has already cached a result, use its grouped-month count to decide
    // whether to mount the content at all. This is the steady-state path: once a user has
    // loaded the home page at least once, we always know in advance whether the "Spend over
    // time" chart will have at least 2 monthly buckets to plot, so we never show-then-hide
    // and we never hide-then-show.
    if (cachedMonthGroupCount !== undefined && cachedMonthGroupCount < 2) {
        return null;
    }

    return <SpendOverTimeSectionContent />;
}

export default SpendOverTimeSection;

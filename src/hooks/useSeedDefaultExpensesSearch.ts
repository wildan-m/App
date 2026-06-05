import {useEffect, useRef} from 'react';
import {seedMyExpensesSavedSearch} from '@libs/actions/Search';
import {setNameValuePair} from '@libs/actions/User';
import {isSubmitterAndApprover} from '@libs/PolicyUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import useLocalize from './useLocalize';
import useOnyx from './useOnyx';

/**
 * Seeds a default "My expenses" saved search (filtered to the current user) exactly once for users who both
 * submit and approve expenses. This mirrors the "my expenses only" default these managers/admins had in
 * Expensify Classic, instead of the overwhelming unfiltered Expenses list in NewDot.
 *
 * Gating is done on the server-persisted `nvp_hasSeededMyExpensesSearch` flag (rather than on "does a search
 * named My expenses already exist") so it seeds exactly once and is never recreated if the user later renames
 * or deletes it.
 */
function useSeedDefaultExpensesSearch() {
    const {translate} = useLocalize();
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [hasSeededMyExpensesSearch] = useOnyx(ONYXKEYS.NVP_HAS_SEEDED_MY_EXPENSES_SEARCH);
    // Guards against re-running the optimistic seed before the server-persisted flag round-trips back to Onyx.
    const hasAttemptedRef = useRef(false);

    useEffect(() => {
        const accountID = session?.accountID;
        const email = session?.email;

        if (!accountID || !email || hasSeededMyExpensesSearch || hasAttemptedRef.current) {
            return;
        }

        // Wait until policies have loaded before deciding eligibility.
        if (!allPolicies || !isSubmitterAndApprover(allPolicies, email)) {
            return;
        }

        hasAttemptedRef.current = true;
        seedMyExpensesSavedSearch(accountID, translate('search.myExpenses'));
        setNameValuePair(ONYXKEYS.NVP_HAS_SEEDED_MY_EXPENSES_SEARCH, true, false);
    }, [session?.accountID, session?.email, allPolicies, hasSeededMyExpensesSearch, translate]);
}

export default useSeedDefaultExpensesSearch;

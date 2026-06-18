import {renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import usePolicyData from '@hooks/usePolicyData';
import initOnyxDerivedValues from '@libs/actions/OnyxDerived';
import {pushTransactionAutoSelectionsOnyxData, pushTransactionViolationsOnyxData} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, PolicyCategories, Report} from '@src/types/onyx';
import {iouReportR14932 as mockIOUReport} from '../../__mocks__/reportData/reports';
import {transactionR14932 as mockTransaction} from '../../__mocks__/reportData/transactions';
import createRandomPolicy from '../utils/collections/policies';
import createRandomPolicyCategories from '../utils/collections/policyCategory';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

type OnyxUpdateValue = {key: string; value?: Array<{name: string}>};

describe('Issue93932 - missing category violation when categories are re-enabled', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
        initOnyxDerivedValues();
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('adds the missingCategory violation optimistically for an existing uncategorized expense', async () => {
        const fakePolicyID = '0';

        // Categories were DISABLED when the expense was created, so all categories are disabled.
        const fakePolicyCategories: PolicyCategories = Object.fromEntries(
            Object.entries(createRandomPolicyCategories(2)).map(([name, category]) => [name, {...category, enabled: false}]),
        );
        const fakePolicy: Policy = {
            ...createRandomPolicy(0),
            id: fakePolicyID,
            areCategoriesEnabled: false,
            requiresCategory: false,
        };

        // Open expense report on the policy holding an uncategorized transaction with no violations.
        const openIOUReport: Report = {
            ...mockIOUReport,
            policyID: fakePolicyID,
            stateNum: CONST.REPORT.STATE_NUM.OPEN,
            statusNum: CONST.REPORT.STATUS_NUM.OPEN,
        };

        await Onyx.multiSet({
            [`${ONYXKEYS.COLLECTION.REPORT}${openIOUReport.reportID}`]: openIOUReport,
            [`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${fakePolicyID}`]: fakePolicyCategories,
            [`${ONYXKEYS.COLLECTION.POLICY}${fakePolicyID}`]: fakePolicy,
            [`${ONYXKEYS.COLLECTION.TRANSACTION}${mockTransaction.transactionID}`]: {
                ...mockTransaction,
                reportID: openIOUReport.reportID,
                policyID: fakePolicyID,
                // New transactions are seeded with the 'Uncategorized' sentinel, not an empty string.
                category: CONST.SEARCH.CATEGORY_DEFAULT_VALUE,
            },
        });
        await waitForBatchedUpdates();

        const {result} = renderHook(() => usePolicyData(fakePolicyID), {wrapper: OnyxListItemProvider});
        await waitForBatchedUpdates();

        // Simulate enablePolicyCategories(policyData, true).
        const policyUpdate: Partial<Policy> = {
            areCategoriesEnabled: true,
            requiresCategory: true,
            pendingFields: {areCategoriesEnabled: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE},
        };
        const policyCategoriesUpdate = Object.fromEntries(Object.keys(fakePolicyCategories).map((name) => [name, {enabled: true}]));

        const onyxData: {optimisticData: OnyxUpdateValue[]; failureData: OnyxUpdateValue[]} = {optimisticData: [], failureData: []};
        const autoSelections = pushTransactionAutoSelectionsOnyxData(onyxData, result.current, policyUpdate, policyCategoriesUpdate);
        pushTransactionViolationsOnyxData(onyxData, result.current, policyUpdate, policyCategoriesUpdate, {}, autoSelections);

        const violationUpdate = onyxData.optimisticData.find((update) => update.key === `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${mockTransaction.transactionID}`);
        const hasMissingCategory = !!violationUpdate?.value?.some((violation) => violation.name === CONST.VIOLATIONS.MISSING_CATEGORY);

        expect(hasMissingCategory).toBe(true);
    });
});

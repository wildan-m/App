import Onyx from 'react-native-onyx';
import {isGroupPolicy, isPaidGroupPolicy} from '@libs/PolicyUtils';
import {isGroupPolicyExpenseReport, isPaidGroupPolicyExpenseReport, isReportInGroupPolicy} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report} from '@src/types/onyx';
import createRandomPolicy from '../utils/collections/policies';
import {createRandomReport} from '../utils/collections/reports';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

/**
 * Regression test for https://github.com/Expensify/App/issues/93111
 *
 * The free `submit2026` workspace must be treated as a group workspace for group-feature
 * gates (violations, report fields, report creation) while staying excluded from billing /
 * paid-only gates. `isGroupPolicy` is a strict superset of `isPaidGroupPolicy` (adds only
 * Submit), and `isGroupPolicyExpenseReport` is the Submit-inclusive report-level counterpart
 * of `isPaidGroupPolicyExpenseReport`.
 */
describe('Submit2026 group-policy helpers (issue 93111)', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
        return waitForBatchedUpdates();
    });

    afterEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    describe('isGroupPolicy (policy-based, group-feature gate)', () => {
        it('includes Submit, Team and Corporate but excludes Personal', () => {
            const submitPolicy: Policy = {...createRandomPolicy(1, CONST.POLICY.TYPE.SUBMIT)};
            const teamPolicy: Policy = {...createRandomPolicy(2, CONST.POLICY.TYPE.TEAM)};
            const corporatePolicy: Policy = {...createRandomPolicy(3, CONST.POLICY.TYPE.CORPORATE)};
            const personalPolicy: Policy = {...createRandomPolicy(4, CONST.POLICY.TYPE.PERSONAL)};

            expect(isGroupPolicy(submitPolicy)).toBe(true);
            expect(isGroupPolicy(teamPolicy)).toBe(true);
            expect(isGroupPolicy(corporatePolicy)).toBe(true);
            expect(isGroupPolicy(personalPolicy)).toBe(false);
        });
    });

    describe('isPaidGroupPolicy (policy-based, billing gate) stays unchanged', () => {
        it('excludes Submit but still includes Team and Corporate', () => {
            const submitPolicy: Policy = {...createRandomPolicy(1, CONST.POLICY.TYPE.SUBMIT)};
            const teamPolicy: Policy = {...createRandomPolicy(2, CONST.POLICY.TYPE.TEAM)};
            const corporatePolicy: Policy = {...createRandomPolicy(3, CONST.POLICY.TYPE.CORPORATE)};

            expect(isPaidGroupPolicy(submitPolicy)).toBe(false);
            expect(isPaidGroupPolicy(teamPolicy)).toBe(true);
            expect(isPaidGroupPolicy(corporatePolicy)).toBe(true);
        });
    });

    describe('report-level helpers for a Submit expense report', () => {
        const SUBMIT_POLICY_ID = '93111';

        const buildSubmitExpenseReport = (): Report => ({
            ...createRandomReport(0, undefined),
            type: CONST.REPORT.TYPE.EXPENSE,
            policyID: SUBMIT_POLICY_ID,
        });

        const seedSubmitPolicy = async () => {
            const submitPolicy: Policy = {...createRandomPolicy(0, CONST.POLICY.TYPE.SUBMIT), id: SUBMIT_POLICY_ID};
            await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${SUBMIT_POLICY_ID}`, submitPolicy);
            await waitForBatchedUpdates();
        };

        it('isReportInGroupPolicy is true for a Submit report', async () => {
            await seedSubmitPolicy();
            expect(isReportInGroupPolicy(buildSubmitExpenseReport())).toBe(true);
        });

        it('isGroupPolicyExpenseReport (new, Submit-inclusive) is true for a Submit expense report', async () => {
            await seedSubmitPolicy();
            expect(isGroupPolicyExpenseReport(buildSubmitExpenseReport())).toBe(true);
        });

        it('isPaidGroupPolicyExpenseReport (billing) stays false for a Submit expense report', async () => {
            await seedSubmitPolicy();
            expect(isPaidGroupPolicyExpenseReport(buildSubmitExpenseReport())).toBe(false);
        });
    });
});

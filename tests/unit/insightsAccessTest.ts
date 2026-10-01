import {getAccessibleDashboards} from '@pages/Insights/dashboardSpecs';
import {canViewAllPolicyData} from '@pages/Insights/insightsAccess';

import CONST from '@src/CONST';
import type {Beta, Policy} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import createRandomPolicy from '../utils/collections/policies';

const LOGIN = 'user@example.com';

function createPolicy(id: string, role: ValueOf<typeof CONST.POLICY.ROLE> | undefined): Policy {
    return {...createRandomPolicy(Number(id)), id, role: role as Policy['role'], employeeList: {}};
}

function toCollection(...policies: Policy[]): OnyxCollection<Policy> {
    return Object.fromEntries(policies.map((policy) => [`policy_${policy.id}`, policy]));
}

const withComplianceBeta = (beta: Beta) => beta === CONST.BETAS.INSIGHTS_COMPLIANCE;
const withoutBetas = () => false;

describe('canViewAllPolicyData', () => {
    it('allows workspace admins', () => {
        expect(canViewAllPolicyData(createPolicy('1', CONST.POLICY.ROLE.ADMIN), LOGIN)).toBe(true);
    });

    it('allows workspace auditors', () => {
        expect(canViewAllPolicyData(createPolicy('1', CONST.POLICY.ROLE.AUDITOR), LOGIN)).toBe(true);
    });

    it('does not allow other members', () => {
        expect(canViewAllPolicyData(createPolicy('1', CONST.POLICY.ROLE.USER), LOGIN)).toBe(false);
    });

    it('falls back to the employee list when the workspace has no role for the user', () => {
        const policy = {...createPolicy('1', undefined), employeeList: {[LOGIN]: {email: LOGIN, role: CONST.POLICY.ROLE.AUDITOR}}};
        expect(canViewAllPolicyData(policy, LOGIN)).toBe(true);
    });
});

describe('getAccessibleDashboards', () => {
    const adminPolicy = createPolicy('1', CONST.POLICY.ROLE.ADMIN);
    const auditorPolicy = createPolicy('2', CONST.POLICY.ROLE.AUDITOR);
    const memberPolicy = createPolicy('3', CONST.POLICY.ROLE.USER);

    it('only includes Spend when the Compliance beta is off, even for admins', () => {
        expect(getAccessibleDashboards(toCollection(adminPolicy), [], LOGIN, withoutBetas)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
    });

    it('includes Compliance for admins', () => {
        expect(getAccessibleDashboards(toCollection(adminPolicy), [], LOGIN, withComplianceBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND, CONST.INSIGHTS.DASHBOARD.COMPLIANCE]);
    });

    it('includes Compliance for auditors', () => {
        expect(getAccessibleDashboards(toCollection(auditorPolicy), [], LOGIN, withComplianceBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND, CONST.INSIGHTS.DASHBOARD.COMPLIANCE]);
    });

    it('does not include Compliance for other members', () => {
        expect(getAccessibleDashboards(toCollection(memberPolicy), [], LOGIN, withComplianceBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
    });

    it('does not include Compliance without any workspace', () => {
        expect(getAccessibleDashboards({}, [], LOGIN, withComplianceBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
    });

    it('includes Compliance when any workspace in a mixed scope is eligible', () => {
        const policies = toCollection(memberPolicy, adminPolicy);
        expect(getAccessibleDashboards(policies, [memberPolicy.id, adminPolicy.id], LOGIN, withComplianceBeta)).toEqual([
            CONST.INSIGHTS.DASHBOARD.SPEND,
            CONST.INSIGHTS.DASHBOARD.COMPLIANCE,
        ]);
    });

    it('only considers the workspaces in scope', () => {
        const policies = toCollection(memberPolicy, adminPolicy);
        expect(getAccessibleDashboards(policies, [memberPolicy.id], LOGIN, withComplianceBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
    });

    it('considers every workspace when none is selected', () => {
        const policies = toCollection(memberPolicy, auditorPolicy);
        expect(getAccessibleDashboards(policies, [], LOGIN, withComplianceBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND, CONST.INSIGHTS.DASHBOARD.COMPLIANCE]);
    });
});

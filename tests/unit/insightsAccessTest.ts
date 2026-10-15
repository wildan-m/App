import {getAccessibleDashboards, getFallbackDashboardID} from '@pages/Insights/dashboardSpecs';
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
const withEfficiencyBeta = (beta: Beta) => beta === CONST.BETAS.INSIGHTS_EFFICIENCY;
const withAllBetas = () => true;
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

describe('Efficiency dashboard access', () => {
    const adminPolicy = createPolicy('1', CONST.POLICY.ROLE.ADMIN);
    const auditorPolicy = createPolicy('2', CONST.POLICY.ROLE.AUDITOR);
    const memberPolicy = createPolicy('3', CONST.POLICY.ROLE.USER);

    it('includes Efficiency for admins and auditors with its beta', () => {
        // Given an admin and an auditor with only the Efficiency beta
        // When the dashboards they can open are resolved
        // Then both can open Efficiency next to Spend
        expect(getAccessibleDashboards(toCollection(adminPolicy), [], LOGIN, withEfficiencyBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND, CONST.INSIGHTS.DASHBOARD.EFFICIENCY]);
        expect(getAccessibleDashboards(toCollection(auditorPolicy), [], LOGIN, withEfficiencyBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND, CONST.INSIGHTS.DASHBOARD.EFFICIENCY]);
    });

    it('does not include Efficiency without its beta or for other members', () => {
        // Given an admin without the beta, and a plain member with it
        // When the dashboards they can open are resolved
        // Then neither can open Efficiency, since it needs both the beta and admin or auditor access
        expect(getAccessibleDashboards(toCollection(adminPolicy), [], LOGIN, withoutBetas)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
        expect(getAccessibleDashboards(toCollection(memberPolicy), [], LOGIN, withEfficiencyBeta)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
    });

    it('lists Efficiency between Spend and Compliance', () => {
        // Given an admin with every Insights beta
        // When the dashboards they can open are resolved
        // Then they're in the order the tabs show them
        expect(getAccessibleDashboards(toCollection(adminPolicy), [], LOGIN, withAllBetas)).toEqual([
            CONST.INSIGHTS.DASHBOARD.SPEND,
            CONST.INSIGHTS.DASHBOARD.EFFICIENCY,
            CONST.INSIGHTS.DASHBOARD.COMPLIANCE,
        ]);
    });

    it('drops Efficiency when the scope is narrowed to workspaces that do not give access to it', () => {
        // Given an admin of one workspace and a plain member of another
        const policies = toCollection(memberPolicy, adminPolicy);

        // When the scope is narrowed to the workspace they're only a member of
        // Then Efficiency is no longer accessible, while a scope including the admin workspace keeps it
        expect(getAccessibleDashboards(policies, [memberPolicy.id], LOGIN, withAllBetas)).toEqual([CONST.INSIGHTS.DASHBOARD.SPEND]);
        expect(getAccessibleDashboards(policies, [memberPolicy.id, adminPolicy.id], LOGIN, withAllBetas)).toEqual([
            CONST.INSIGHTS.DASHBOARD.SPEND,
            CONST.INSIGHTS.DASHBOARD.EFFICIENCY,
            CONST.INSIGHTS.DASHBOARD.COMPLIANCE,
        ]);
    });
});

describe('getFallbackDashboardID', () => {
    it('keeps a dashboard that is accessible in the current scope', () => {
        // Given the user is on Efficiency and can still access it
        // When the fallback is resolved
        // Then there is none, so the route is left alone
        expect(getFallbackDashboardID(CONST.INSIGHTS.DASHBOARD.EFFICIENCY, [CONST.INSIGHTS.DASHBOARD.SPEND, CONST.INSIGHTS.DASHBOARD.EFFICIENCY])).toBeUndefined();
    });

    it('falls back to the first accessible dashboard when the current one is out of scope', () => {
        // Given the user is on Efficiency but the scoped workspaces only give access to Spend
        // When the fallback is resolved
        // Then it's Spend, the dashboard the route is replaced with
        expect(getFallbackDashboardID(CONST.INSIGHTS.DASHBOARD.EFFICIENCY, [CONST.INSIGHTS.DASHBOARD.SPEND])).toBe(CONST.INSIGHTS.DASHBOARD.SPEND);
    });
});

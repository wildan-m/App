/** Rules deciding which Insights data the current user can see in a workspace. */

import {isPolicyAdmin, isPolicyAuditor} from '@libs/PolicyUtils';

import type {Policy} from '@src/types/onyx';

/** Whether the user can see everyone's data in the workspace, which workspace admins and auditors can */
function canViewAllPolicyData(policy: Policy, login: string | undefined): boolean {
    return isPolicyAdmin(policy, login) || isPolicyAuditor(policy, login);
}

// eslint-disable-next-line import/prefer-default-export
export {canViewAllPolicyData};

/* eslint-disable @typescript-eslint/naming-convention */
import {write} from '@libs/API';
import {WRITE_COMMANDS} from '@libs/API/types';
import {updateApprovalWorkflow} from '@userActions/Workflow';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type {Approver, Member} from '@src/types/onyx/ApprovalWorkflow';
import type ApprovalWorkflow from '@src/types/onyx/ApprovalWorkflow';
import type {AnyOnyxUpdate} from '@src/types/onyx/Request';
import type {PolicyEmployeeList} from '@src/types/onyx/PolicyEmployee';
import createRandomPolicy from '../utils/collections/policies';

jest.mock('@libs/API');
jest.mock('@libs/Navigation/Navigation', () => ({navigate: jest.fn(), goBack: jest.fn(), dismissModal: jest.fn()}));

const mockWrite = jest.mocked(write);

const OWNER = 'owner@example.com';
const AGENT = 'agent@example.com';
const MEMBER = 'member@example.com';
const NEW_APPROVER = 'newapprover@example.com';

function getOptimisticEmployeeList(): PolicyEmployeeList {
    const options = mockWrite.mock.calls.at(0)?.at(2);
    if (!options || typeof options !== 'object' || !('optimisticData' in options)) {
        throw new Error('write was not called with optimistic options');
    }
    const {optimisticData} = options as {optimisticData: AnyOnyxUpdate[]};
    const policyUpdate = optimisticData.find((update) => typeof update.key === 'string' && update.key.startsWith(ONYXKEYS.COLLECTION.POLICY));
    const value = policyUpdate?.value as {employeeList?: PolicyEmployeeList} | undefined;
    return value?.employeeList ?? {};
}

describe('Issue #93260 - deleted agent must not resurface as a greyed-out workflow after editing approval', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('preserves the DELETE pending action of an offline-deleted agent when it is removed as an approver', () => {
        // Agent was deleted while offline: its employeeList row carries a DELETE pending action.
        // The member used to submit to the agent (agent was their approver).
        const policy: Policy = {
            ...createRandomPolicy(1),
            approver: OWNER,
            owner: OWNER,
            employeeList: {
                [OWNER]: {email: OWNER, submitsTo: OWNER},
                [AGENT]: {email: AGENT, submitsTo: OWNER, forwardsTo: OWNER, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE},
                [MEMBER]: {email: MEMBER, submitsTo: AGENT},
                [NEW_APPROVER]: {email: NEW_APPROVER, submitsTo: OWNER},
            },
        };

        // The admin opens "Edit Approval" and swaps the approver from the deleted agent to a new member.
        const approvalWorkflow: ApprovalWorkflow = {
            members: [{email: MEMBER, displayName: MEMBER}] as Member[],
            approvers: [{email: NEW_APPROVER, displayName: NEW_APPROVER, forwardsTo: undefined, isCircularReference: false}] as Approver[],
            isDefault: false,
        };
        const membersToRemove: Member[] = [];
        const approversToRemove: Approver[] = [{email: AGENT, displayName: AGENT, forwardsTo: undefined, isCircularReference: false}];

        updateApprovalWorkflow(approvalWorkflow, membersToRemove, approversToRemove, policy);

        expect(mockWrite).toHaveBeenCalledWith(WRITE_COMMANDS.UPDATE_WORKSPACE_APPROVAL, expect.any(Object), expect.any(Object));

        const optimisticEmployeeList = getOptimisticEmployeeList();

        // The agent stays flagged for deletion - it must NOT be downgraded to UPDATE, otherwise the
        // workflows page re-renders it as a greyed-out (pending update) workflow with the deleted agent.
        if (optimisticEmployeeList[AGENT]) {
            expect(optimisticEmployeeList[AGENT]?.pendingAction).toBe(CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE);
        }
        expect(optimisticEmployeeList[AGENT]?.pendingAction).not.toBe(CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE);
    });
});

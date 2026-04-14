import {useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import type {SingleSelectItem} from '@components/Search/FilterDropdowns/SingleSelectPopup';
import {isControlPolicy, isPolicyApprover} from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';
import useLocalize from './useLocalize';

const ALL_ROLES_VALUE = 'all';
const APPROVERS_VALUE = 'approvers';

type MemberForRoleFilter = {
    login: string;
};

type UseWorkspaceRoleFilterResult = {
    rolePreFilter: (item: MemberForRoleFilter) => boolean;
    roleOptions: Array<SingleSelectItem<string>>;
    selectedRole: SingleSelectItem<string> | null;
    handleRoleChange: (item: SingleSelectItem<string> | null) => void;
    dropdownLabel: string;
    allMembersLabel: string;
    hasActiveRoleFilter: boolean;
};

function useWorkspaceRoleFilter(policy: OnyxEntry<Policy>): UseWorkspaceRoleFilterResult {
    const {translate} = useLocalize();

    const [selectedRole, setSelectedRole] = useState<SingleSelectItem<string> | null>(null);

    const allMembersLabel = translate('workspace.people.allMembers');

    const roleOptions: Array<SingleSelectItem<string>> = [
        {text: allMembersLabel, value: ALL_ROLES_VALUE},
        {text: translate('common.admin'), value: CONST.POLICY.ROLE.ADMIN},
        {text: translate('common.approver'), value: APPROVERS_VALUE},
    ];
    if (isControlPolicy(policy)) {
        roleOptions.push({text: translate('common.auditor'), value: CONST.POLICY.ROLE.AUDITOR});
    }

    // Precompute the set of approver logins for this policy so the filter is O(members)
    // instead of O(members × employeeList) when the Approvers option is selected.
    const approverLogins = new Set<string>();
    if (policy?.approver) {
        approverLogins.add(policy.approver);
    }
    for (const employee of Object.values(policy?.employeeList ?? {})) {
        if (employee?.submitsTo) {
            approverLogins.add(employee.submitsTo);
        }
        if (employee?.forwardsTo) {
            approverLogins.add(employee.forwardsTo);
        }
        if (employee?.overLimitForwardsTo) {
            approverLogins.add(employee.overLimitForwardsTo);
        }
    }

    // If the current policy switches to a non-Control plan (e.g. the admin downgrades),
    // the Auditor option disappears from roleOptions. Clear a stale Auditor selection
    // so the list does not silently stay filtered by an option the user can no longer see.
    const selectionStillValid = !selectedRole || roleOptions.some((option) => option.value === selectedRole.value);
    const effectiveSelection = selectionStillValid ? selectedRole : null;

    const rolePreFilter = (() => {
        if (!effectiveSelection || effectiveSelection.value === ALL_ROLES_VALUE) {
            return () => true;
        }
        if (effectiveSelection.value === APPROVERS_VALUE) {
            if (policy?.approver) {
                return (item: MemberForRoleFilter) => approverLogins.has(item.login) || isPolicyApprover(policy, item.login);
            }
            return (item: MemberForRoleFilter) => approverLogins.has(item.login);
        }
        const roleValue = effectiveSelection.value;
        return (item: MemberForRoleFilter) => policy?.employeeList?.[item.login]?.role === roleValue;
    })();

    const handleRoleChange = (item: SingleSelectItem<string> | null) => {
        if (!item || item.value === ALL_ROLES_VALUE) {
            setSelectedRole(null);
            return;
        }
        setSelectedRole(item);
    };

    const dropdownLabel = effectiveSelection?.text ?? allMembersLabel;

    return {
        rolePreFilter,
        roleOptions,
        selectedRole: effectiveSelection,
        handleRoleChange,
        dropdownLabel,
        allMembersLabel,
        hasActiveRoleFilter: !!effectiveSelection,
    };
}

export default useWorkspaceRoleFilter;

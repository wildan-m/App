import Button from '@components/Button';
import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import type {DropdownOption, WorkspaceMemberBulkActionType} from '@components/ButtonWithDropdownMenu/types';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import type {TableHandle} from '@components/Table';
import type {AgentRowData, AgentsTableColumnKey} from '@components/Tables/AgentsTable';
import AgentsTable from '@components/Tables/AgentsTable';

import useChatWithAgent from '@hooks/useChatWithAgent';
import useCleanupSelectedOptions from '@hooks/useCleanupSelectedOptions';
import useConfirmModal from '@hooks/useConfirmModal';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useMobileSelectionMode from '@hooks/useMobileSelectionMode';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useShouldDisplayButtonsInSeparateLine from '@hooks/useShouldDisplayButtonsInSeparateLine';
import useSwitchToDelegator from '@hooks/useSwitchToDelegator';
import useThemeStyles from '@hooks/useThemeStyles';
import useWorkspaceDocumentTitle from '@hooks/useWorkspaceDocumentTitle';

import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import {clearAddMemberError, clearDeleteMemberError, clearUpdateMemberRoleError, removeMembers} from '@libs/actions/Policy/Member';
import {getLatestError} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import {getMemberAccountIDsForWorkspace} from '@libs/PolicyUtils';

import {openAgentsPage} from '@userActions/Agent';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import type {WithPolicyAndFullscreenLoadingProps} from '../withPolicyAndFullscreenLoading';

import withPolicyAndFullscreenLoading from '../withPolicyAndFullscreenLoading';
import WorkspacePageWithSections from '../WorkspacePageWithSections';

type WorkspaceAgentsPageProps = WithPolicyAndFullscreenLoadingProps & PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.AGENTS>;

function WorkspaceAgentsPage({personalDetails, route, policy}: WorkspaceAgentsPageProps) {
    useWorkspaceDocumentTitle(policy?.name, 'agentsPage.title');
    const policyID = route.params.policyID;
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {isOffline} = useNetwork();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const shouldDisplayButtonsInSeparateLine = useShouldDisplayButtonsInSeparateLine();
    const icons = useMemoizedLazyExpensifyIcons(['Plus', 'RemoveMembers']);
    const chatWithAgent = useChatWithAgent();
    const switchToDelegator = useSwitchToDelegator();
    const {showConfirmModal} = useConfirmModal();
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const isMobileSelectionModeEnabled = useMobileSelectionMode();

    const [agentPrompts] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT);

    useEffect(() => {
        openAgentsPage();
    }, []);

    // Agents the current user manages (owns directly or copilots the owner) — the entries OpenAgentsPage returns.
    const manageableAgentAccountIDs = new Set(Object.keys(agentPrompts ?? {}).map((key) => Number(key.slice(ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT.length))));

    const policyMemberEmailsToAccountIDs = getMemberAccountIDsForWorkspace(policy?.employeeList, true);

    const handleErrorClose = (pendingAction: PendingAction | null | undefined, email: string, accountID: number) => {
        if (pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
            clearDeleteMemberError(policyID, email);
        } else if (pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD) {
            clearAddMemberError(policyID, email, accountID);
        } else {
            clearUpdateMemberRoleError(policyID, email);
        }
    };

    const agentEmailsByAccountID = new Map<string, string>();
    const agents: AgentRowData[] = Object.entries(policy?.employeeList ?? {}).flatMap(([email, member]) => {
        const accountID = policyMemberEmailsToAccountIDs[email];
        const details = accountID ? personalDetails?.[accountID] : undefined;
        if (!details?.isCustomAgent) {
            return [];
        }
        const pendingAction = member.pendingAction;
        const isPendingDeletion = pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
        if (!isOffline && isPendingDeletion) {
            return [];
        }
        const canManage = manageableAgentAccountIDs.has(accountID);
        const rowErrors = getLatestError(member.errors ?? undefined);
        agentEmailsByAccountID.set(String(accountID), email);

        return [
            {
                keyForList: String(accountID),
                accountID,
                displayName: details.displayName ?? details.login ?? '',
                login: details.login ?? email,
                pendingAction,
                errors: Object.keys(rowErrors).length > 0 ? rowErrors : undefined,
                disabled: isPendingDeletion,
                canManage,
                action: () => {
                    if (canManage) {
                        Navigation.navigate(ROUTES.SETTINGS_AGENTS_EDIT.getRoute(accountID));
                        return;
                    }
                    Navigation.navigate(ROUTES.WORKSPACE_MEMBER_DETAILS.getRoute(policyID, accountID));
                },
                onChatPress: () => chatWithAgent(accountID),
                onCopilotPress: () => {
                    if (!canManage) {
                        return;
                    }
                    switchToDelegator(details.login ?? '');
                },
                dismissError: () => handleErrorClose(pendingAction, email, accountID),
            },
        ];
    });

    const tableRef = useRef<TableHandle<AgentRowData, AgentsTableColumnKey, string>>(null);
    const canSelectMultiple = shouldUseNarrowLayout ? isMobileSelectionModeEnabled : true;

    const agentsByAccountID = new Map(agents.map((agent) => [agent.keyForList, agent]));
    const selectedAgentKeys = selectedAgents.filter((accountIDString) => {
        const agent = agentsByAccountID.get(accountIDString);
        return !!agent && agent.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
    });

    const clearSelectedAgents = () => {
        setSelectedAgents((prevSelectedAgents) => (prevSelectedAgents.length > 0 ? [] : prevSelectedAgents));
    };

    useCleanupSelectedOptions(clearSelectedAgents);

    const removeSelectedAgents = () => {
        const selectedEmails = selectedAgentKeys.map((accountIDString) => agentEmailsByAccountID.get(accountIDString)).filter((email): email is string => !!email);
        removeMembers(policy, selectedEmails, policyMemberEmailsToAccountIDs);
        clearSelectedAgents();
    };

    const askForConfirmationToRemove = async () => {
        const firstSelectedAgent = agentsByAccountID.get(selectedAgentKeys.at(0) ?? '');
        const result = await showConfirmModal({
            title: translate('workspace.people.removeMembersTitle', {count: selectedAgentKeys.length}),
            prompt: translate('workspace.people.removeMembersPrompt', {count: selectedAgentKeys.length, memberName: firstSelectedAgent?.displayName ?? ''}),
            confirmText: translate('common.remove'),
            cancelText: translate('common.cancel'),
            buttonVariant: CONST.BUTTON_VARIANT.DANGER,
            shouldHandleNavigationBack: false,
        });

        if (result.action !== ModalActions.CONFIRM) {
            return;
        }

        removeSelectedAgents();
    };

    const bulkActionsButtonOptions: Array<DropdownOption<WorkspaceMemberBulkActionType>> = [
        {
            text: translate('workspace.people.removeMembersTitle', {count: selectedAgentKeys.length}),
            value: CONST.POLICY.MEMBERS_BULK_ACTION_TYPES.REMOVE,
            icon: icons.RemoveMembers,
            shouldSkipFocusRestore: true,
            onSelected: askForConfirmationToRemove,
        },
    ];

    const shouldShowBulkActionsButton = shouldUseNarrowLayout ? canSelectMultiple : selectedAgentKeys.length > 0;
    const selectionModeHeader = isMobileSelectionModeEnabled && shouldUseNarrowLayout;

    const newAgentButton = (
        <Button
            variant="success"
            onPress={() => Navigation.navigate(ROUTES.SETTINGS_AGENTS_NEW.getRoute({policyID}))}
        >
            <Button.Icon src={icons.Plus} />
            <Button.Text>{translate('agentsPage.newAgent')}</Button.Text>
        </Button>
    );

    const headerButtons = shouldShowBulkActionsButton ? (
        <ButtonWithDropdownMenu<WorkspaceMemberBulkActionType>
            variant={CONST.BUTTON_VARIANT.SUCCESS}
            shouldAlwaysShowDropdownMenu
            customText={translate('workspace.common.selected', {count: selectedAgentKeys.length})}
            size={CONST.BUTTON_SIZE.MEDIUM}
            onPress={() => null}
            options={bulkActionsButtonOptions}
            isSplitButton={false}
            isDisabled={!selectedAgentKeys.length}
            testID="WorkspaceAgentsPage-header-dropdown-menu-button"
        />
    ) : (
        newAgentButton
    );

    return (
        <WorkspacePageWithSections
            headerText={selectionModeHeader ? translate('common.selectMultiple') : translate('agentsPage.title')}
            route={route}
            headerContent={!shouldDisplayButtonsInSeparateLine && headerButtons}
            testID="WorkspaceAgentsPage"
            shouldShowLoading={false}
            shouldUseHeadlineHeader={!selectionModeHeader}
            shouldShowOfflineIndicatorInWideScreen
            onBackButtonPress={() => {
                if (isMobileSelectionModeEnabled) {
                    clearSelectedAgents();
                    turnOffMobileSelectionMode();
                    return;
                }
                Navigation.goBack();
            }}
        >
            {() => (
                <>
                    {shouldDisplayButtonsInSeparateLine && <View style={[styles.ph5, styles.pb3]}>{headerButtons}</View>}
                    <AgentsTable
                        ref={tableRef}
                        agents={agents}
                        canSelectAgents={canSelectMultiple}
                        selectedKeys={selectedAgentKeys}
                        onRowSelectionChange={setSelectedAgents}
                    />
                </>
            )}
        </WorkspacePageWithSections>
    );
}

WorkspaceAgentsPage.displayName = 'WorkspaceAgentsPage';

export default withPolicyAndFullscreenLoading(WorkspaceAgentsPage);

import type {ListRenderItemInfo} from '@shopify/flash-list';
import React from 'react';
import {View} from 'react-native';
import type {CompareItemsCallback, IsItemInSearchCallback, TableColumn, TableData, TableHandle} from '@components/Table';
import Table from '@components/Table';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import tokenizedSearch from '@libs/tokenizedSearch';
import variables from '@styles/variables';
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';
import AgentsTableRow from './AgentsTableRow';

type AgentsTableColumnKey = 'agent' | 'actions';

type AgentRowData = TableData & {
    /** Account ID of the agent */
    accountID: number;

    /** Display name of the agent */
    displayName: string;

    /** Login (email) of the agent */
    login: string;

    /** Whether the agent has update (name/prompt/avatar) errors */
    hasUpdateErrors: boolean;

    /** Whether the agent's chat/copilot/edit actions are disabled */
    areActionsDisabled: boolean;

    /** Whether the agent row is pending deletion */
    isPendingDeletion: boolean;

    /** Pending action for offline feedback */
    pendingAction?: OnyxCommon.PendingAction | null;

    /** Errors to display on the row */
    errors?: OnyxCommon.Errors | null;

    /** Called when the row is pressed (opens the edit RHP) */
    action: () => void;

    /** Called when the row error is dismissed */
    dismissError: () => void;

    /** Called when the chat action is pressed */
    onChatPress: () => void;

    /** Called when the copilot action is pressed */
    onCopilotPress: () => void;
};

type AgentsTableProps = {
    ref?: React.Ref<TableHandle<AgentRowData, AgentsTableColumnKey, string>> | undefined;

    /** The agents to render in the table */
    agents: AgentRowData[];

    /** Whether row selection is enabled */
    selectionEnabled: boolean;

    /** The currently selected row keys */
    selectedKeys: string[];

    /** Called when the selection changes */
    onRowSelectionChange: (selectedRowKeys: string[]) => void;
};

export default function AgentsTable({ref, agents, selectionEnabled, selectedKeys, onRowSelectionChange}: AgentsTableProps) {
    const styles = useThemeStyles();
    const {translate, localeCompare} = useLocalize();
    const {shouldUseNarrowLayout, isMediumScreenWidth} = useResponsiveLayout();
    const shouldUseNarrowTableLayout = shouldUseNarrowLayout || isMediumScreenWidth;

    const agentsColumns: Array<TableColumn<AgentsTableColumnKey>> = [
        {
            key: 'agent',
            label: translate('agentsPage.agent'),
            sortable: true,
        },
        {
            key: 'actions',
            label: '',
            width: shouldUseNarrowTableLayout ? variables.tableCaretColumnWidth : variables.agentsTableActionsColumnWidth,
            sortable: false,
        },
    ];

    const compareTableItems: CompareItemsCallback<AgentRowData, AgentsTableColumnKey> = (item1, item2, activeSorting) => {
        const orderMultiplier = activeSorting.order === 'asc' ? 1 : -1;
        return localeCompare(item1.displayName, item2.displayName) * orderMultiplier;
    };

    const isTableItemInSearch: IsItemInSearchCallback<AgentRowData> = (item, searchValue) => {
        const results = tokenizedSearch([item], searchValue, (option) => [option.displayName, option.login]);
        return results.length > 0;
    };

    const renderTableItem = ({item, index}: ListRenderItemInfo<AgentRowData>) => (
        <AgentsTableRow
            item={item}
            rowIndex={index}
            shouldUseNarrowTableLayout={shouldUseNarrowTableLayout}
        />
    );

    return (
        <Table
            ref={ref}
            data={agents}
            selectedKeys={selectedKeys}
            selectionEnabled={selectionEnabled}
            columns={agentsColumns}
            initialSortColumn="agent"
            title={translate('agentsPage.title')}
            renderItem={renderTableItem}
            compareItems={compareTableItems}
            isItemInSearch={isTableItemInSearch}
            keyExtractor={(item) => item.keyForList}
            onRowSelectionChange={onRowSelectionChange}
        >
            <View style={[styles.mb5, styles.mh5]}>
                <Table.SearchBar
                    label={translate('agentsPage.findAgent')}
                    style={[styles.mb0, styles.mh0]}
                />
            </View>
            <Table.Header />
            <Table.Body />
        </Table>
    );
}

export type {AgentsTableColumnKey, AgentRowData};

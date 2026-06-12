import type {ListRenderItemInfo} from '@shopify/flash-list';
import React from 'react';
import type {ValueOf} from 'type-fest';
import type {CompareItemsCallback, IsItemInSearchCallback, TableColumn, TableData, TableHandle} from '@components/Table';
import Table from '@components/Table';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import tokenizedSearch from '@libs/tokenizedSearch';
import type {AvatarSource} from '@libs/UserAvatarUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';
import DomainMembersTableRow from './DomainMembersTableRow';

type DomainMemberTableColumnKey = 'member' | 'group' | 'actions';

type DomainMemberTableRowData = TableData & {
    /** The member's accountID */
    accountID: number;

    /** The member's login */
    login: string;

    /** The member's display name shown as the primary text */
    text: string;

    /** The member's login shown as the secondary text */
    alternateText: string;

    /** The avatar source for the member */
    avatarSource: AvatarSource;

    /** Optional custom element rendered on the right side of the row (e.g. the member's group or a badge) */
    rightElement?: React.ReactNode;

    /** Whether the row can be pressed to open the member details */
    isInteractive: boolean;

    /** Any errors related to the row */
    errors?: OnyxCommon.Errors;

    /** The pending action for the row */
    pendingAction?: OnyxCommon.PendingAction;

    /** The brick road indicator to display for the row */
    brickRoadIndicator?: ValueOf<typeof CONST.BRICK_ROAD_INDICATOR_STATUS>;

    /** Callback fired when the row is pressed */
    action: () => void;

    /** Callback fired when the row error is dismissed */
    dismissError: () => void;
};

type DomainMembersTableProps = {
    ref?: React.Ref<TableHandle<DomainMemberTableRowData, DomainMemberTableColumnKey, string>> | undefined;

    /** The members to display in the table */
    members: DomainMemberTableRowData[];

    /** Label for the member column header */
    memberColumnLabel: string;

    /** Label for the group column header. When provided, the group column is shown. */
    groupColumnLabel?: string;

    /** Whether row selection is enabled */
    selectionEnabled: boolean;

    /** The list of selected row keys */
    selectedKeys: string[];

    /** Callback fired when the selection changes */
    onRowSelectionChange: (selectedRowKeys: string[]) => void;

    /** Label and accessibility label for the search input */
    searchLabel: string;

    /** Component rendered when there are no rows to display */
    ListEmptyComponent?: React.ReactElement;
};

export default function DomainMembersTable({
    ref,
    members,
    memberColumnLabel,
    groupColumnLabel,
    selectionEnabled,
    selectedKeys,
    onRowSelectionChange,
    searchLabel,
    ListEmptyComponent,
}: DomainMembersTableProps) {
    const styles = useThemeStyles();
    const {localeCompare} = useLocalize();
    const shouldShowGroupColumn = !!groupColumnLabel;

    const domainMemberTableColumns: Array<TableColumn<DomainMemberTableColumnKey>> = [
        {
            sortable: true,
            key: 'member',
            label: memberColumnLabel,
        },
        ...(shouldShowGroupColumn
            ? [
                  {
                      sortable: false,
                      key: 'group' as const,
                      label: groupColumnLabel ?? '',
                  },
              ]
            : []),
        {
            sortable: false,
            key: 'actions',
            width: variables.tableCaretColumnWidth,
            label: '',
            styling: {containerStyles: [styles.justifyContentEnd, styles.pr3]},
        },
    ];

    const compareTableItems: CompareItemsCallback<DomainMemberTableRowData, DomainMemberTableColumnKey> = (item1, item2, activeSorting) => {
        const orderMultiplier = activeSorting.order === 'asc' ? 1 : -1;
        return orderMultiplier * localeCompare(item1.text, item2.text);
    };

    const isTableItemInSearch: IsItemInSearchCallback<DomainMemberTableRowData> = (item, searchValue) => {
        const results = tokenizedSearch([item], searchValue, (option) => [option.text, option.alternateText]);
        return results.length > 0;
    };

    const renderTableItem = ({item, index}: ListRenderItemInfo<DomainMemberTableRowData>) => {
        return (
            <DomainMembersTableRow
                item={item}
                rowIndex={index}
                shouldShowGroupColumn={shouldShowGroupColumn}
            />
        );
    };

    return (
        <Table
            ref={ref}
            data={members}
            columns={domainMemberTableColumns}
            renderItem={renderTableItem}
            compareItems={compareTableItems}
            isItemInSearch={isTableItemInSearch}
            initialSortColumn="member"
            title={memberColumnLabel}
            selectionEnabled={selectionEnabled}
            selectedKeys={selectedKeys}
            onRowSelectionChange={onRowSelectionChange}
            ListEmptyComponent={ListEmptyComponent}
            keyExtractor={(row) => row.keyForList}
        >
            {members.length >= CONST.STANDARD_LIST_ITEM_LIMIT && <Table.SearchBar label={searchLabel} />}
            <Table.Header />
            <Table.Body />
        </Table>
    );
}

export type {DomainMemberTableRowData, DomainMemberTableColumnKey};

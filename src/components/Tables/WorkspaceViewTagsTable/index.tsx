import type {CompareItemsCallback, FilterConfig, IsItemInFilterCallback, IsItemInSearchCallback, TableColumn} from '@components/Table';
import Table from '@components/Table';
import type {WorkspaceTagTableRowData} from '@components/Tables/WorkspaceTagsTable';
import WorkspaceTagsTableRow from '@components/Tables/WorkspaceTagsTable/WorkspaceTagsTableRow';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import tokenizedSearch from '@libs/tokenizedSearch';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import type {ListRenderItemInfo} from '@shopify/flash-list';

import React from 'react';

type WorkspaceViewTagColumnKey = 'name' | 'enabled' | 'actions';

const TAG_STATUS_FILTER_VALUES = {
    ENABLED: 'enabled',
    DISABLED: 'disabled',
} as const;

type WorkspaceViewTagsTableProps = {
    tags: WorkspaceTagTableRowData[];
    hasDependentTags: boolean;
    selectionEnabled: boolean;
    selectedKeys: string[];
    onRowSelectionChange: (selectedRowKeys: string[]) => void;
};

export default function WorkspaceViewTagsTable({tags, hasDependentTags, selectionEnabled, selectedKeys, onRowSelectionChange}: WorkspaceViewTagsTableProps) {
    const styles = useThemeStyles();
    const {translate, localeCompare} = useLocalize();

    const shouldShowEnabledColumn = !hasDependentTags;

    const columns: Array<TableColumn<WorkspaceViewTagColumnKey>> = [
        {
            key: 'name',
            label: translate('common.name'),
            sortable: true,
        },
        ...(shouldShowEnabledColumn
            ? [
                  {
                      key: 'enabled' as const,
                      label: translate('common.enabled'),
                      sortable: true,
                      width: variables.tableSwitchColumnWidth,
                      styling: {
                          containerStyles: [styles.justifyContentEnd],
                      },
                  },
              ]
            : []),
        {
            key: 'actions',
            label: '',
            sortable: false,
            width: variables.tableCaretColumnWidth,
        },
    ];

    const compareItems: CompareItemsCallback<WorkspaceTagTableRowData, WorkspaceViewTagColumnKey> = (item1, item2, activeSorting) => {
        const orderMultiplier = activeSorting.order === 'asc' ? 1 : -1;

        if (activeSorting.columnKey === 'enabled') {
            const enabled1 = item1.enabled ? 1 : 0;
            const enabled2 = item2.enabled ? 1 : 0;
            return (enabled1 - enabled2) * orderMultiplier;
        }

        return localeCompare(item1.name, item2.name) * orderMultiplier;
    };

    const isItemInSearch: IsItemInSearchCallback<WorkspaceTagTableRowData> = (item, searchValue) => {
        const results = tokenizedSearch([item], searchValue, (option) => [option.name, option.value]);
        return results.length > 0;
    };

    const isItemInFilter: IsItemInFilterCallback<WorkspaceTagTableRowData> = (item, filterValues) => {
        if (filterValues.includes(TAG_STATUS_FILTER_VALUES.ENABLED) && item.enabled) {
            return true;
        }

        return filterValues.includes(TAG_STATUS_FILTER_VALUES.DISABLED) && !item.enabled;
    };

    // The status filter is only offered when the Enabled column is shown. With dependent tags the enabled state is
    // neither displayed nor editable, so filtering on it would be filtering by something the user cannot see.
    const filterConfig: FilterConfig | undefined = shouldShowEnabledColumn
        ? {
              status: {
                  label: translate('common.status'),
                  filterType: CONST.TABLES.FILTER_TYPE.SINGLE_SELECT,
                  options: [
                      {
                          label: translate('common.enabled'),
                          value: TAG_STATUS_FILTER_VALUES.ENABLED,
                      },
                      {
                          label: translate('common.disabled'),
                          value: TAG_STATUS_FILTER_VALUES.DISABLED,
                      },
                  ],
              },
          }
        : undefined;

    const renderItem = ({item, index}: ListRenderItemInfo<WorkspaceTagTableRowData>) => (
        <WorkspaceTagsTableRow
            item={item}
            rowIndex={index}
            shouldUseNarrowTableLayout
            shouldShowGLCodeColumn={false}
            shouldShowApproverColumn={false}
            shouldShowTagCountColumn={false}
        />
    );

    if (tags.length === 0) {
        return null;
    }

    return (
        <Table
            data={tags}
            columns={columns}
            filters={filterConfig}
            selectionEnabled={selectionEnabled}
            shouldEnableSelectionInNarrowPaneModal
            selectedKeys={selectedKeys}
            initialSortColumn="name"
            title={translate('workspace.common.tags')}
            renderItem={renderItem}
            compareItems={compareItems}
            isItemInFilter={isItemInFilter}
            isItemInSearch={isItemInSearch}
            keyExtractor={(item) => item.keyForList}
            onRowSelectionChange={onRowSelectionChange}
        >
            <Table.FilterBar label={translate('workspace.tags.findTag')} />
            <Table.NoResultsState />
            <Table.Header />
            <Table.Body />
        </Table>
    );
}

export type {WorkspaceViewTagColumnKey};

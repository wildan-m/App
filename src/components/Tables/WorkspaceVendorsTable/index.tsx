import Switch from '@components/Switch';
import type {CompareItemsCallback, IsItemInSearchCallback, TableColumn, TableData} from '@components/Table';
import Table from '@components/Table';
import {getCellAccessibilityProps, shouldUseTableSemantics} from '@components/Table/tableAccessibility';
import TextWithTooltip from '@components/TextWithTooltip';

import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import tokenizedSearch from '@libs/tokenizedSearch';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import type {ListRenderItemInfo} from '@shopify/flash-list';

import React from 'react';
import {View} from 'react-native';

type WorkspaceVendorTableColumnKey = 'name' | 'enabled';

type WorkspaceVendorTableRowData = TableData & {
    name: string;
    enabled: boolean;
    onToggleEnabled: (enabled: boolean) => void;
};

type WorkspaceVendorsTableProps = {
    vendors: WorkspaceVendorTableRowData[];
    selectionEnabled: boolean;
    selectedKeys: string[];
    onRowSelectionChange: (selectedRowKeys: string[]) => void;
};

function WorkspaceVendorsTable({vendors, selectionEnabled, selectedKeys, onRowSelectionChange}: WorkspaceVendorsTableProps) {
    const styles = useThemeStyles();
    const {translate, localeCompare} = useLocalize();
    const {shouldUseNarrowLayout, isMediumScreenWidth} = useResponsiveLayout();
    const isTableSemanticsEnabled = shouldUseTableSemantics(shouldUseNarrowLayout || isMediumScreenWidth);

    const columns: Array<TableColumn<WorkspaceVendorTableColumnKey>> = [
        {
            key: 'name',
            label: translate('common.name'),
            sortable: true,
        },
        {
            key: 'enabled',
            label: translate('common.enabled'),
            sortable: true,
            width: variables.tableSwitchColumnWidth,
            styling: {
                containerStyles: [styles.justifyContentEnd],
            },
        },
    ];

    const compareItems: CompareItemsCallback<WorkspaceVendorTableRowData> = (item1, item2, activeSorting) => {
        const orderMultiplier = activeSorting.order === 'asc' ? 1 : -1;

        if (activeSorting.columnKey === 'enabled') {
            const enabled1 = item1.enabled ? 1 : 0;
            const enabled2 = item2.enabled ? 1 : 0;
            return (enabled1 - enabled2) * orderMultiplier;
        }

        return localeCompare(item1.name, item2.name) * orderMultiplier;
    };

    const isItemInSearch: IsItemInSearchCallback<WorkspaceVendorTableRowData> = (item, searchValue) => {
        const results = tokenizedSearch([item], searchValue.toLowerCase(), (option) => [option.name]);
        return results.length > 0;
    };

    const renderVendorItem = ({item, index}: ListRenderItemInfo<WorkspaceVendorTableRowData>) => (
        <Table.Row
            interactive={false}
            accessibilityLabel={`${item.name}, ${item.enabled ? translate('common.enabled') : translate('common.disabled')}`}
            rowIndex={index}
            sentryLabel={CONST.SENTRY_LABEL.WORKSPACE.INITIAL.VENDORS}
        >
            <View
                style={[styles.flex1, styles.flexRow, styles.alignItemsCenter]}
                {...getCellAccessibilityProps(isTableSemanticsEnabled)}
            >
                <TextWithTooltip
                    shouldShowTooltip
                    numberOfLines={1}
                    text={item.name}
                />
            </View>
            <View
                style={[styles.justifyContentCenter, styles.alignItemsEnd]}
                {...getCellAccessibilityProps(isTableSemanticsEnabled)}
            >
                <Switch
                    isOn={item.enabled}
                    accessibilityLabel={`${translate('workspace.vendors.enableVendor')}: ${item.name}`}
                    onToggle={item.onToggleEnabled}
                />
            </View>
        </Table.Row>
    );

    return (
        <Table
            data={vendors}
            initialSortColumn="name"
            selectionEnabled={selectionEnabled}
            title={translate('workspace.common.vendors')}
            columns={columns}
            compareItems={compareItems}
            isItemInSearch={isItemInSearch}
            renderItem={renderVendorItem}
            selectedKeys={selectedKeys}
            keyExtractor={(item) => item.keyForList}
            onRowSelectionChange={onRowSelectionChange}
        >
            <Table.FilterBar label={translate('workspace.vendors.findVendor')} />
            <Table.EmptyState
                title={translate('workspace.vendors.emptyTitle')}
                subtitleText={translate('workspace.vendors.emptySubtitle')}
            />
            <Table.NoResultsState />
            <Table.Header />
            <Table.Body />
        </Table>
    );
}

export default WorkspaceVendorsTable;

export type {WorkspaceVendorTableRowData};

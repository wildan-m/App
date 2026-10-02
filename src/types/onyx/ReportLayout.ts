import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

import type Transaction from './Transaction';

/** User's report layout group-by preference */
type ReportLayoutGroupBy = ValueOf<typeof CONST.REPORT_LAYOUT.GROUP_BY>;

/** User's report layout option preference (detailed grouped view or flat matrix view) */
type ReportLayoutOption = ValueOf<typeof CONST.REPORT_LAYOUT.LAYOUT_OPTION>;

/** Selection shown in the report group-by selector: a group-by field, or matrix for the "None" (ungrouped) option */
type ReportLayoutSelection = ReportLayoutGroupBy | typeof CONST.REPORT_LAYOUT.LAYOUT_OPTION.MATRIX;

/** How the user wants reports with a single expense to open: the single-expense view or the table view */
type SingleExpenseReportView = ValueOf<typeof CONST.REPORT_LAYOUT.SINGLE_EXPENSE_VIEW>;

/** Grouped transactions for display */
type GroupedTransactions = {
    /** Display name of the group (category or tag name) */
    groupName: string;

    /** Key used for grouping (category or tag value) */
    groupKey: string;

    /** Transactions in this group */
    transactions: Transaction[];

    /** Subtotal amount for all transactions in this group */
    subTotalAmount: number;

    /** Whether the group is currently expanded */
    isExpanded: boolean;
};

export type {ReportLayoutGroupBy, ReportLayoutOption, ReportLayoutSelection, SingleExpenseReportView, GroupedTransactions};

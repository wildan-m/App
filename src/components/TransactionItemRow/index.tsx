import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import type {SearchColumnType, TableColumnSize} from '@components/Search/types';
import type {CardList, Policy, Report, ReportAction, TransactionViolation} from '@src/types/onyx';
import type {TransactionWithOptionalSearchFields} from './sharedTypes';
import TransactionItemRowNarrow from './TransactionItemRowNarrow';
import TransactionItemRowWide from './TransactionItemRowWide';

type TransactionItemRowProps = {
    transactionItem: TransactionWithOptionalSearchFields;
    report?: Report;
    policy?: Policy;
    shouldUseNarrowLayout: boolean;
    isSelected: boolean;
    shouldShowTooltip: boolean;
    dateColumnSize: TableColumnSize;
    submittedColumnSize?: TableColumnSize;
    approvedColumnSize?: TableColumnSize;
    postedColumnSize?: TableColumnSize;
    exportedColumnSize?: TableColumnSize;
    amountColumnSize: TableColumnSize;
    taxAmountColumnSize: TableColumnSize;
    onCheckboxPress?: (transactionID: string) => void;
    shouldShowCheckbox?: boolean;
    columns?: SearchColumnType[];
    onButtonPress?: () => void;
    style?: StyleProp<ViewStyle>;
    isReportItemChild?: boolean;
    isActionLoading?: boolean;
    isInSingleTransactionReport?: boolean;
    shouldShowRadioButton?: boolean;
    onRadioButtonPress?: (transactionID: string) => void;
    shouldShowErrors?: boolean;
    shouldHighlightItemWhenSelected?: boolean;
    isDisabled?: boolean;
    violations?: TransactionViolation[];
    shouldShowBottomBorder?: boolean;
    onArrowRightPress?: () => void;
    isHover?: boolean;
    shouldShowArrowRightOnNarrowLayout?: boolean;
    reportActions?: ReportAction[];
    checkboxSentryLabel?: string;
    isLargeScreenWidth?: boolean;
    policyForMovingExpenses?: Policy;
    nonPersonalAndWorkspaceCards?: CardList;
    isActionColumnWide?: boolean;
};

function TransactionItemRow({
    transactionItem,
    report,
    policy,
    shouldUseNarrowLayout,
    isSelected,
    shouldShowTooltip,
    dateColumnSize,
    submittedColumnSize,
    approvedColumnSize,
    postedColumnSize,
    exportedColumnSize,
    amountColumnSize,
    taxAmountColumnSize,
    onCheckboxPress,
    shouldShowCheckbox,
    columns,
    onButtonPress,
    style,
    isReportItemChild,
    isActionLoading,
    isInSingleTransactionReport,
    shouldShowRadioButton,
    onRadioButtonPress,
    shouldShowErrors,
    shouldHighlightItemWhenSelected,
    isDisabled,
    violations,
    shouldShowBottomBorder,
    onArrowRightPress,
    isHover,
    shouldShowArrowRightOnNarrowLayout,
    reportActions,
    checkboxSentryLabel,
    isLargeScreenWidth,
    policyForMovingExpenses,
    nonPersonalAndWorkspaceCards,
    isActionColumnWide,
}: TransactionItemRowProps) {
    if (shouldUseNarrowLayout) {
        return (
            <TransactionItemRowNarrow
                transactionItem={transactionItem}
                report={report}
                isSelected={isSelected}
                shouldShowTooltip={shouldShowTooltip}
                onCheckboxPress={onCheckboxPress}
                shouldShowCheckbox={shouldShowCheckbox}
                columns={columns}
                style={style}
                isInSingleTransactionReport={isInSingleTransactionReport}
                shouldShowRadioButton={shouldShowRadioButton}
                onRadioButtonPress={onRadioButtonPress}
                shouldShowErrors={shouldShowErrors}
                shouldHighlightItemWhenSelected={shouldHighlightItemWhenSelected}
                isDisabled={isDisabled}
                violations={violations}
                shouldShowBottomBorder={shouldShowBottomBorder}
                onArrowRightPress={onArrowRightPress}
                shouldShowArrowRightOnNarrowLayout={shouldShowArrowRightOnNarrowLayout}
                reportActions={reportActions}
                checkboxSentryLabel={checkboxSentryLabel}
            />
        );
    }

    return (
        <TransactionItemRowWide
            transactionItem={transactionItem}
            report={report}
            policy={policy}
            isSelected={isSelected}
            shouldShowTooltip={shouldShowTooltip}
            dateColumnSize={dateColumnSize}
            submittedColumnSize={submittedColumnSize}
            approvedColumnSize={approvedColumnSize}
            postedColumnSize={postedColumnSize}
            exportedColumnSize={exportedColumnSize}
            amountColumnSize={amountColumnSize}
            taxAmountColumnSize={taxAmountColumnSize}
            onCheckboxPress={onCheckboxPress}
            columns={columns}
            onButtonPress={onButtonPress}
            style={style}
            isReportItemChild={isReportItemChild}
            isActionLoading={isActionLoading}
            isInSingleTransactionReport={isInSingleTransactionReport}
            shouldShowRadioButton={shouldShowRadioButton}
            onRadioButtonPress={onRadioButtonPress}
            shouldShowErrors={shouldShowErrors}
            shouldHighlightItemWhenSelected={shouldHighlightItemWhenSelected}
            isDisabled={isDisabled}
            violations={violations}
            shouldShowBottomBorder={shouldShowBottomBorder}
            onArrowRightPress={onArrowRightPress}
            isHover={isHover}
            reportActions={reportActions}
            checkboxSentryLabel={checkboxSentryLabel}
            isLargeScreenWidth={isLargeScreenWidth}
            policyForMovingExpenses={policyForMovingExpenses}
            nonPersonalAndWorkspaceCards={nonPersonalAndWorkspaceCards}
            isActionColumnWide={isActionColumnWide}
        />
    );
}

TransactionItemRow.displayName = 'TransactionItemRow';

export default TransactionItemRow;
export type {TransactionWithOptionalSearchFields};

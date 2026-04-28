import React, {useMemo} from 'react';
import {View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import Checkbox from '@components/Checkbox';
import Icon from '@components/Icon';
import RadioButton from '@components/RadioButton';
import DateCell from '@components/Search/SearchList/ListItem/DateCell';
import type {SearchColumnType} from '@components/Search/types';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {getDecodedCategoryName, isCategoryMissing} from '@libs/CategoryUtils';
import {getIOUActionForTransactionID} from '@libs/ReportActionsUtils';
import {isSettled} from '@libs/ReportUtils';
import StringUtils from '@libs/StringUtils';
import {getDescription, getMerchant, getCreated as getTransactionCreated, hasMissingSmartscanFields, isAmountMissing, isMerchantMissing, isScanning} from '@libs/TransactionUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {ReportAction, TransactionViolation} from '@src/types/onyx';
import ChatBubbleCell from './DataCells/ChatBubbleCell';
import MerchantOrDescriptionCell from './DataCells/MerchantCell';
import ReceiptCell from './DataCells/ReceiptCell';
import TotalCell from './DataCells/TotalCell';
import TypeCell from './DataCells/TypeCell';
import type {TransactionWithOptionalSearchFields} from './sharedTypes';
import TransactionItemRowRBR from './TransactionItemRowRBR';

type TransactionItemRowNarrowProps = {
    transactionItem: TransactionWithOptionalSearchFields;
    report?: TransactionWithOptionalSearchFields['report'];
    isSelected: boolean;
    shouldShowTooltip: boolean;
    onCheckboxPress?: (transactionID: string) => void;
    shouldShowCheckbox?: boolean;
    columns?: SearchColumnType[];
    style?: StyleProp<ViewStyle>;
    isInSingleTransactionReport?: boolean;
    shouldShowRadioButton?: boolean;
    onRadioButtonPress?: (transactionID: string) => void;
    shouldShowErrors?: boolean;
    shouldHighlightItemWhenSelected?: boolean;
    isDisabled?: boolean;
    violations?: TransactionViolation[];
    shouldShowBottomBorder?: boolean;
    onArrowRightPress?: () => void;
    shouldShowArrowRightOnNarrowLayout?: boolean;
    reportActions?: ReportAction[];
    checkboxSentryLabel?: string;
};

const EMPTY_ACTIVE_STYLE: StyleProp<ViewStyle> = [];

function getMerchantName(transactionItem: TransactionWithOptionalSearchFields, translate: (key: TranslationPaths) => string) {
    const shouldShowMerchant = transactionItem.shouldShowMerchant ?? true;

    let merchant = transactionItem?.formattedMerchant ?? getMerchant(transactionItem);

    if (isScanning(transactionItem) && shouldShowMerchant) {
        merchant = translate('iou.receiptStatusTitle');
    }

    const merchantName = StringUtils.getFirstLine(merchant);
    return merchantName !== CONST.TRANSACTION.PARTIAL_TRANSACTION_MERCHANT && merchantName !== CONST.TRANSACTION.DEFAULT_MERCHANT ? merchantName : '';
}

function TransactionItemRowNarrow({
    transactionItem,
    report,
    isSelected,
    shouldShowTooltip,
    onCheckboxPress = () => {},
    shouldShowCheckbox = false,
    columns,
    style,
    isInSingleTransactionReport = false,
    shouldShowRadioButton = false,
    onRadioButtonPress = () => {},
    shouldShowErrors = true,
    shouldHighlightItemWhenSelected = true,
    isDisabled = false,
    violations,
    shouldShowBottomBorder,
    onArrowRightPress,
    shouldShowArrowRightOnNarrowLayout,
    reportActions,
    checkboxSentryLabel,
}: TransactionItemRowNarrowProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const theme = useTheme();
    const expensicons = useMemoizedLazyExpensifyIcons(['ArrowRight']);
    const createdAt = getTransactionCreated(transactionItem);
    const transactionThreadReportID = reportActions ? getIOUActionForTransactionID(reportActions, transactionItem.transactionID)?.childReportID : undefined;

    const bgActiveStyles = useMemo(() => {
        if (!isSelected || !shouldHighlightItemWhenSelected) {
            return EMPTY_ACTIVE_STYLE;
        }
        return styles.activeComponentBG;
    }, [isSelected, styles.activeComponentBG, shouldHighlightItemWhenSelected]);

    const merchant = useMemo(() => getMerchantName(transactionItem, translate), [transactionItem, translate]);
    const description = getDescription(transactionItem);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const merchantOrDescription = merchant || description;

    const missingFieldError = useMemo(() => {
        if (isSettled(report)) {
            return '';
        }

        const hasFieldErrors = hasMissingSmartscanFields(transactionItem, report);
        if (hasFieldErrors) {
            const amountMissing = isAmountMissing(transactionItem);
            const merchantMissing = isMerchantMissing(transactionItem);
            let error = '';

            if (amountMissing && merchantMissing) {
                error = translate('violations.reviewRequired');
            } else if (amountMissing) {
                error = translate('iou.missingAmount');
            } else if (merchantMissing && !isSettled(report)) {
                error = translate('iou.missingMerchant');
            }

            return error;
        }
    }, [transactionItem, translate, report]);

    const shouldRenderChatBubbleCell = useMemo(() => {
        return columns?.includes(CONST.SEARCH.TABLE_COLUMNS.COMMENTS) ?? false;
    }, [columns]);

    const categoryForDisplay = isCategoryMissing(transactionItem?.category) ? '' : getDecodedCategoryName(transactionItem?.category ?? '');

    return (
        <>
            <View
                style={[styles.expenseWidgetRadius, styles.overflowHidden, bgActiveStyles, styles.justifyContentEvenly, style]}
                testID="transaction-item-row"
            >
                <View style={[styles.flexRow]}>
                    {shouldShowCheckbox && (
                        <Checkbox
                            disabled={isDisabled}
                            onPress={() => {
                                onCheckboxPress(transactionItem.transactionID);
                            }}
                            accessibilityLabel={CONST.ROLE.CHECKBOX}
                            isChecked={isSelected}
                            style={styles.mr3}
                            containerStyle={styles.m0}
                            wrapperStyle={styles.justifyContentCenter}
                            sentryLabel={checkboxSentryLabel}
                        />
                    )}
                    <ReceiptCell
                        transactionItem={transactionItem}
                        isSelected={isSelected}
                        style={styles.mr3}
                        shouldUseNarrowLayout
                    />
                    <View style={[styles.flex2, styles.flexColumn, styles.gap1]}>
                        <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentBetween, styles.gap2]}>
                            {merchantOrDescription ? (
                                <MerchantOrDescriptionCell
                                    merchantOrDescription={merchantOrDescription}
                                    shouldShowTooltip={shouldShowTooltip}
                                    shouldUseNarrowLayout
                                    isDescription={!merchant}
                                />
                            ) : null}
                            <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap2, !merchantOrDescription && styles.mlAuto]}>
                                {shouldRenderChatBubbleCell && (
                                    <ChatBubbleCell
                                        transaction={transactionItem}
                                        isInSingleTransactionReport={isInSingleTransactionReport}
                                    />
                                )}
                                <TotalCell
                                    transactionItem={transactionItem}
                                    shouldShowTooltip={shouldShowTooltip}
                                    shouldUseNarrowLayout
                                />
                            </View>
                        </View>
                        <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentBetween, styles.gap2]}>
                            <DateCell
                                date={createdAt}
                                showTooltip={shouldShowTooltip}
                                isLargeScreenWidth={false}
                                suffixText={categoryForDisplay}
                            />
                            <TypeCell
                                transactionItem={transactionItem}
                                shouldShowTooltip={shouldShowTooltip}
                                shouldUseNarrowLayout
                            />
                        </View>
                    </View>
                    {!!shouldShowArrowRightOnNarrowLayout && !!onArrowRightPress && (
                        <View style={[styles.justifyContentEnd, styles.alignItemsEnd, styles.mbHalf, styles.ml3]}>
                            <Icon
                                src={expensicons.ArrowRight}
                                fill={theme.icon}
                                additionalStyles={styles.opacitySemiTransparent}
                                width={variables.iconSizeNormal}
                                height={variables.iconSizeNormal}
                            />
                        </View>
                    )}
                    {shouldShowRadioButton && (
                        <View style={[styles.ml3, styles.justifyContentCenter]}>
                            <RadioButton
                                isChecked={isSelected}
                                disabled={isDisabled}
                                onPress={() => onRadioButtonPress?.(transactionItem.transactionID)}
                                accessibilityLabel={CONST.ROLE.RADIO}
                                shouldUseNewStyle
                            />
                        </View>
                    )}
                </View>
                {shouldShowErrors && (
                    <TransactionItemRowRBR
                        transaction={transactionItem}
                        violations={violations}
                        report={report}
                        containerStyles={[styles.mt3, styles.minHeight4]}
                        missingFieldError={missingFieldError}
                        transactionThreadReportID={transactionThreadReportID}
                        shouldUseNarrowLayout
                    />
                )}
            </View>
            {!!shouldShowBottomBorder && (
                <View style={bgActiveStyles}>
                    <View style={styles.ph3}>
                        <View style={[styles.borderBottom]} />
                    </View>
                </View>
            )}
        </>
    );
}

TransactionItemRowNarrow.displayName = 'TransactionItemRowNarrow';

export default TransactionItemRowNarrow;
export type {TransactionItemRowNarrowProps};

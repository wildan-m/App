import Button from '@components/ButtonComposed';
import {useConfirmationFields} from '@components/MoneyRequestConfirmationFields/context';
import AmountField from '@components/MoneyRequestConfirmationList/sections/AmountField';
import DescriptionField from '@components/MoneyRequestConfirmationList/sections/DescriptionField';
import DistanceField from '@components/MoneyRequestConfirmationList/sections/DistanceField';
import MerchantField from '@components/MoneyRequestConfirmationList/sections/MerchantField';
import RateField from '@components/MoneyRequestConfirmationList/sections/RateField';
import {receiptSliceSelector} from '@components/MoneyRequestConfirmationList/sections/selectors';
import TimeFields from '@components/MoneyRequestConfirmationList/sections/TimeFields';
import useTransactionSelector from '@components/MoneyRequestConfirmationList/sections/useTransactionSelector';
import {useDetailsFields} from '@components/MoneyRequestConfirmationListFooter/DetailsFieldsContext';
import type {AmountDisplay, DistanceData, ErrorState, RequiredFlags} from '@components/MoneyRequestConfirmationListFooter/fieldGroupTypes';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import {shouldShowReceiptEmptyState} from '@libs/IOUUtils';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import Navigation from '@libs/Navigation/Navigation';
import {hasReceipt} from '@libs/TransactionUtils';

import CONST from '@src/CONST';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import type * as OnyxTypes from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

type TransactionDetailsFieldsProps = {
    /** Active policy (read by Amount/Description/Rate/Merchant) */
    policy: OnyxEntry<OnyxTypes.Policy>;

    /** Pre-formatted amount values consumed by Amount/Attendee fields */
    amountDisplay: AmountDisplay;

    /** Distance-rate metadata threaded into Distance/Rate fields */
    distanceData: DistanceData;

    /** Per-field "required" flags driven by policy/workflow */
    requiredFlags: RequiredFlags;

    /** Error state surfaced into Amount/Merchant */
    errorState: ErrorState;

    /** Whether the parent-owned participant picker modal is currently open (new manual expense flow). Drives amount autofocus on picker close. */
    isParticipantPickerVisible: boolean;
};

/**
 * The expense-type-driven half of the confirmation fields, for every type that has not migrated to a
 * footer variant of its own.
 */
function TransactionDetailsFields({policy, amountDisplay, distanceData, requiredFlags, errorState, isParticipantPickerVisible}: TransactionDetailsFieldsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['ReceiptPlus']);
    const {fieldVisibility, isCompactMode, iouCurrencyCode, shouldNavigateToUpgradePath, shouldSelectPolicy} = useDetailsFields();
    const {
        action,
        iouType,
        transactionID,
        reportID,
        reportActionID,
        isReadOnly,
        didConfirm,
        isNewManualExpenseFlowEnabled,
        isPolicyExpenseChat,
        isPerDiemRequest,
        isManualDistanceRequest,
        isOdometerDistanceRequest,
        isGPSDistanceRequest,
    } = useConfirmationFields();
    const shouldAutoFocusAmountField = !canUseTouchScreen();

    const receiptSlice = useTransactionSelector(transactionID, receiptSliceSelector);

    // The compact add-receipt button replaces the full-width receipt empty state on the new manual
    // expense flow (see ReceiptSection, which hides the empty state under the same conditions).
    const shouldShowCompactReceiptButton =
        isNewManualExpenseFlowEnabled &&
        receiptSlice?.iouRequestType === CONST.IOU.REQUEST_TYPE.MANUAL &&
        !hasReceipt(receiptSlice) &&
        shouldShowReceiptEmptyState(iouType, action, policy, isPerDiemRequest);

    const amountField = !isCompactMode && fieldVisibility.amount && (
        <AmountField
            amount={amountDisplay.amount}
            formattedAmount={amountDisplay.formattedAmount}
            distanceRateCurrency={distanceData.distanceRateCurrency}
            iouCurrencyCode={iouCurrencyCode}
            isDistanceRequest={fieldVisibility.distance}
            shouldShowTimeRequestFields={fieldVisibility.time}
            shouldDisplayFieldError={errorState.shouldDisplayFieldError}
            formError={errorState.formError}
            policy={policy}
            clearFormErrors={errorState.clearFormErrors}
            setFormError={errorState.setFormError}
            autoFocus={shouldAutoFocusAmountField}
            isParticipantPickerVisible={isParticipantPickerVisible}
        />
    );

    return (
        <>
            {amountField && shouldShowCompactReceiptButton ? (
                <View style={[styles.flexRow, styles.alignItemsCenter]}>
                    <View style={styles.flex1}>{amountField}</View>
                    <Button
                        onPress={() => {
                            if (!transactionID) {
                                return;
                            }
                            Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.MONEY_REQUEST_STEP_SCAN.getRoute(CONST.IOU.ACTION.CREATE, iouType, transactionID, reportID)));
                        }}
                        accessibilityLabel={translate('iou.addReceipt')}
                        innerStyles={[styles.compactReceiptButton, styles.mr4]}
                    >
                        <Button.Icon
                            src={icons.ReceiptPlus}
                            accessibilityLabel={translate('iou.addReceipt')}
                        />
                    </Button>
                </View>
            ) : (
                amountField
            )}

            {!isCompactMode && fieldVisibility.merchant && (
                <MerchantField
                    isMerchantRequired={requiredFlags.isMerchantRequired}
                    isNewManualExpenseFlowEnabled={isNewManualExpenseFlowEnabled}
                    isReadOnly={isReadOnly}
                    didConfirm={didConfirm}
                    shouldDisplayFieldError={errorState.shouldDisplayFieldError}
                    formError={errorState.formError}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    reportActionID={reportActionID}
                />
            )}

            <DescriptionField
                isDescriptionRequired={requiredFlags.isDescriptionRequired}
                policy={policy}
            />

            {fieldVisibility.distance && (
                <DistanceField
                    hasRoute={distanceData.hasRoute}
                    distance={distanceData.distance}
                    unit={distanceData.unit}
                    isManualDistanceRequest={isManualDistanceRequest}
                    isOdometerDistanceRequest={isOdometerDistanceRequest}
                    isGPSDistanceRequest={isGPSDistanceRequest}
                    isReadOnly={isReadOnly}
                    didConfirm={didConfirm}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    reportActionID={reportActionID}
                    customUnit={distanceData.customUnit}
                />
            )}

            {!isCompactMode && fieldVisibility.rate && (
                <RateField
                    distanceRateName={distanceData.distanceRateName}
                    distanceRateCurrency={distanceData.distanceRateCurrency}
                    unit={distanceData.unit}
                    mileageRate={distanceData.mileageRate}
                    expenseDate={distanceData.expenseDate}
                    customUnitRateID={distanceData.customUnitRateID}
                    didConfirm={didConfirm}
                    isReadOnly={isReadOnly}
                    isPolicyExpenseChat={isPolicyExpenseChat}
                    policy={policy}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    reportActionID={reportActionID}
                    formError={errorState.formError}
                    shouldNavigateToUpgradePath={shouldNavigateToUpgradePath}
                    shouldSelectPolicy={shouldSelectPolicy}
                    shouldShowRateAutoUpdatedTooltip={distanceData.shouldShowRateAutoUpdatedTooltip}
                />
            )}

            {!isCompactMode && fieldVisibility.time && <TimeFields />}
        </>
    );
}

export default TransactionDetailsFields;

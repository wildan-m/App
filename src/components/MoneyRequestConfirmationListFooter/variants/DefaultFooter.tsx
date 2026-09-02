import FormHelpMessage from '@components/FormHelpMessage';
import {useConfirmationFields} from '@components/MoneyRequestConfirmationFields/context';
import {receiptSliceSelector} from '@components/MoneyRequestConfirmationList/sections/selectors';
import useTransactionSelector from '@components/MoneyRequestConfirmationList/sections/useTransactionSelector';
import ConfirmationFieldList from '@components/MoneyRequestConfirmationListFooter/ConfirmationFieldList';
import TransactionDetailsFields from '@components/MoneyRequestConfirmationListFooter/fieldGroups/TransactionDetailsFields';
import DistanceMapSection from '@components/MoneyRequestConfirmationListFooter/sections/DistanceMapSection';
import InvoiceSenderSection from '@components/MoneyRequestConfirmationListFooter/sections/InvoiceSenderSection';
import ReceiptSection from '@components/MoneyRequestConfirmationListFooter/sections/ReceiptSection';
import type {MoneyRequestConfirmationListFooterProps} from '@components/MoneyRequestConfirmationListFooter/types';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {hasReceipt} from '@libs/TransactionUtils';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

/**
 * Fallback footer for expense types that have not been extracted yet. Deleted once the last one has a variant.
 */
function DefaultFooter({
    receiptStitchError,
    isCompactMode,
    policy,
    policyTags,
    selectedParticipants,
    distanceData,
    amountDisplay,
    requiredFlags,
    visibilityFlags,
    errorState,
    toggleHandlers,
    receiptOptions,
    compactControls,
}: MoneyRequestConfirmationListFooterProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {showMoreFields, setShowMoreFields} = compactControls;
    const {transactionID, isNewManualExpenseFlowEnabled} = useConfirmationFields();

    const receiptSlice = useTransactionSelector(transactionID, receiptSliceSelector);
    const isManualRequest = receiptSlice?.iouRequestType === CONST.IOU.REQUEST_TYPE.MANUAL;
    const hasAttachedReceipt = hasReceipt(receiptSlice) || !!receiptOptions.receiptPath;

    return (
        <View style={isCompactMode ? styles.flex1 : undefined}>
            <View>
                <InvoiceSenderSection selectedParticipants={selectedParticipants} />
                <DistanceMapSection />
            </View>

            {isNewManualExpenseFlowEnabled && isManualRequest && !isCompactMode && (
                <Text style={[styles.ph5, styles.mt2, styles.textLabelSupporting]}>{hasAttachedReceipt ? translate('common.receipt') : translate('iou.expenseDetails')}</Text>
            )}

            <ReceiptSection
                policy={policy}
                showMoreFields={showMoreFields}
                {...receiptOptions}
            />

            {!!receiptStitchError && (
                <View style={styles.mh5}>
                    <FormHelpMessage message={receiptStitchError} />
                </View>
            )}

            <ConfirmationFieldList
                policy={policy}
                policyTags={policyTags}
                selectedParticipants={selectedParticipants}
                amountDisplay={amountDisplay}
                requiredFlags={requiredFlags}
                visibilityFlags={visibilityFlags}
                errorState={errorState}
                toggleHandlers={toggleHandlers ?? {}}
                compactState={{isCompactMode, setShowMoreFields}}
            >
                <TransactionDetailsFields
                    policy={policy}
                    amountDisplay={amountDisplay}
                    distanceData={distanceData}
                    requiredFlags={requiredFlags}
                    errorState={errorState}
                    isParticipantPickerVisible={visibilityFlags.isParticipantPickerVisible}
                />
            </ConfirmationFieldList>
        </View>
    );
}

export default DefaultFooter;

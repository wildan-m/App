import lodashIsEmpty from 'lodash/isEmpty';
import React, {useCallback} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import DatePicker from '@components/DatePicker';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDelegateAccountID from '@hooks/useDelegateAccountID';
import useDuplicateTransactionsAndViolations from '@hooks/useDuplicateTransactionsAndViolations';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import usePolicy from '@hooks/usePolicy';
import usePolicyForMovingExpenses from '@hooks/usePolicyForMovingExpenses';
import useRestartOnReceiptFailure from '@hooks/useRestartOnReceiptFailure';
import useShowNotFoundPageInIOUStep from '@hooks/useShowNotFoundPageInIOUStep';
import useThemeStyles from '@hooks/useThemeStyles';
import {convertToBackendAmount, getCurrencyDecimals} from '@libs/CurrencyUtils';
import DistanceRequestUtils from '@libs/DistanceRequestUtils';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {shouldUseTransactionDraft} from '@libs/IOUUtils';
import Navigation from '@libs/Navigation/Navigation';
import {getDistanceRateCustomUnitRate, isTaxTrackingEnabled} from '@libs/PolicyUtils';
import {isPolicyExpenseChat as isPolicyExpenseChatReportUtil} from '@libs/ReportUtils';
import {calculateTaxAmount, getDefaultTaxCode, getDistanceInMeters, getFormattedCreated, getTaxValue, hasReceipt, isDistanceRequest} from '@libs/TransactionUtils';
import {setCustomUnitRateID, setMoneyRequestCreated, setMoneyRequestTaxAmount, setMoneyRequestTaxRate, setMoneyRequestTaxValue} from '@userActions/IOU/MoneyRequest';
import {setDraftSplitTransaction} from '@userActions/IOU/Split';
import {updateMoneyRequestDate} from '@userActions/IOU/UpdateMoneyRequest';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/MoneyRequestDateForm';
import type {Report, Transaction} from '@src/types/onyx';
import StepScreenWrapper from './StepScreenWrapper';
import withFullTransactionOrNotFound from './withFullTransactionOrNotFound';
import type {WithWritableReportOrNotFoundProps} from './withWritableReportOrNotFound';
import withWritableReportOrNotFound from './withWritableReportOrNotFound';

type IOURequestStepDateProps = WithWritableReportOrNotFoundProps<typeof SCREENS.MONEY_REQUEST.STEP_DATE> & {
    /** Holds data related to Money Request view state, rather than the underlying Money Request data. */
    transaction: OnyxEntry<Transaction>;

    /** The report linked to the transaction */
    report: OnyxEntry<Report>;
};

function IOURequestStepDate({
    route: {
        params: {action, iouType, reportID, backTo, reportActionID, transactionID},
    },
    transaction,
    report,
}: IOURequestStepDateProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const policy = usePolicy(report?.policyID);
    const isTrackExpense = iouType === CONST.IOU.TYPE.TRACK;
    const {policyForMovingExpensesID} = usePolicyForMovingExpenses();
    const policyForTrackExpense = usePolicy(isTrackExpense ? policyForMovingExpensesID : undefined);
    const {duplicateTransactions, duplicateTransactionViolations} = useDuplicateTransactionsAndViolations(transactionID ? [transactionID] : []);
    const [policyCategories] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${report?.policyID}`);
    const [policyTags] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_TAGS}${report?.policyID}`);
    const [parentReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(report?.parentReportID)}`);
    const [parentReportNextStep] = useOnyx(`${ONYXKEYS.COLLECTION.NEXT_STEP}${getNonEmptyStringOnyxID(report?.parentReportID)}`);

    const [splitDraftTransaction] = useOnyx(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`);
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const delegateAccountID = useDelegateAccountID();
    const {isBetaEnabled} = usePermissions();
    const isASAPSubmitBetaEnabled = isBetaEnabled(CONST.BETAS.ASAP_SUBMIT);
    const {isOffline} = useNetwork();
    const [lastSelectedDistanceRates] = useOnyx(ONYXKEYS.NVP_LAST_SELECTED_DISTANCE_RATES);
    const isEditing = action === CONST.IOU.ACTION.EDIT;
    const isSplitBill = iouType === CONST.IOU.TYPE.SPLIT;
    const isSplitExpense = iouType === CONST.IOU.TYPE.SPLIT_EXPENSE;
    // In the split flow, when editing we use SPLIT_TRANSACTION_DRAFT to save draft value
    const isEditingSplit = (isSplitBill || isSplitExpense) && isEditing;
    const currentCreated = isEditingSplit && !lodashIsEmpty(splitDraftTransaction) ? getFormattedCreated(splitDraftTransaction) : getFormattedCreated(transaction);
    useRestartOnReceiptFailure(transaction, reportID, iouType, action);

    const shouldShowNotFound = useShowNotFoundPageInIOUStep(action, iouType, reportActionID, report, transaction);

    const navigateBack = () => {
        Navigation.goBack(backTo);
    };

    const updateDate = (value: FormOnyxValues<typeof ONYXKEYS.FORMS.MONEY_REQUEST_DATE_FORM>) => {
        const newCreated = value.moneyRequestCreated;

        // Only update created if it has changed
        if (newCreated === currentCreated) {
            navigateBack();
            return;
        }

        // In the split flow, when editing we use SPLIT_TRANSACTION_DRAFT to save draft value
        if (isEditingSplit) {
            setDraftSplitTransaction(transactionID, splitDraftTransaction, {created: newCreated});
            navigateBack();
            return;
        }

        const isTransactionDraft = shouldUseTransactionDraft(action);

        if (isEditing) {
            updateMoneyRequestDate({
                transactionID,
                transactionThreadReport: report,
                parentReport,
                transactions: duplicateTransactions,
                transactionViolations: duplicateTransactionViolations,
                value: newCreated,
                policy,
                policyTags,
                policyCategories,
                currentUserAccountIDParam: currentUserPersonalDetails.accountID,
                currentUserEmailParam: currentUserPersonalDetails.login ?? '',
                isASAPSubmitBetaEnabled,
                parentReportNextStep,
                isOffline,
                delegateAccountID,
            });
        } else {
            setMoneyRequestCreated(transactionID, newCreated, isTransactionDraft, hasReceipt(transaction));

            const isPolicyExpenseChat = isPolicyExpenseChatReportUtil(report);
            if (isDistanceRequest(transaction) && (isPolicyExpenseChat || isTrackExpense)) {
                const effectivePolicy = isTrackExpense ? policyForTrackExpense : policy;
                const rateID = DistanceRequestUtils.getCustomUnitRateID({
                    reportID,
                    isPolicyExpenseChat,
                    policy: effectivePolicy,
                    lastSelectedDistanceRates,
                    isTrackDistanceExpense: isTrackExpense,
                    expenseDate: newCreated,
                });
                setCustomUnitRateID(transactionID, rateID, transaction, effectivePolicy);

                // The date-driven rate change must also re-sync the tax tied to the new rate,
                // mirroring the manual rate selection in IOURequestStepDistanceRate. Without this,
                // the tax of the previously selected rate would stay on the transaction.
                const shouldShowTax = isTaxTrackingEnabled(isPolicyExpenseChat || isTrackExpense, effectivePolicy, true);
                if (shouldShowTax && rateID) {
                    const newRate = DistanceRequestUtils.getRateByCustomUnitRateID({policy: effectivePolicy, customUnitRateID: rateID});
                    const policyCustomUnitRate = getDistanceRateCustomUnitRate(effectivePolicy, rateID);
                    const defaultTaxCode = getDefaultTaxCode(effectivePolicy, transaction, undefined, rateID) ?? '';
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    const taxRateExternalID = policyCustomUnitRate?.attributes?.taxRateExternalID || defaultTaxCode;
                    const currentUnit = DistanceRequestUtils.getDistanceUnit(transaction, newRate);
                    const taxableAmount = DistanceRequestUtils.getTaxableAmount(effectivePolicy, rateID, getDistanceInMeters(transaction, currentUnit));
                    const taxValue = taxRateExternalID ? getTaxValue(effectivePolicy, transaction, taxRateExternalID) : undefined;
                    const taxAmount = convertToBackendAmount(calculateTaxAmount(taxValue, taxableAmount, getCurrencyDecimals(newRate?.currency)));
                    setMoneyRequestTaxAmount(transactionID, taxAmount, isTransactionDraft);
                    setMoneyRequestTaxRate(transactionID, taxRateExternalID ?? null, isTransactionDraft);
                    setMoneyRequestTaxValue(transactionID, taxValue ?? null, isTransactionDraft);
                }
            }
        }

        navigateBack();
    };

    const validate = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MONEY_REQUEST_DATE_FORM>) => {
            const errors: FormInputErrors<typeof ONYXKEYS.FORMS.MONEY_REQUEST_DATE_FORM> = {};
            if (!values[INPUT_IDS.MONEY_REQUEST_CREATED] || values[INPUT_IDS.MONEY_REQUEST_CREATED] === '') {
                errors[INPUT_IDS.MONEY_REQUEST_CREATED] = translate('common.error.fieldRequired');
            }
            return errors;
        },
        [translate],
    );

    return (
        <StepScreenWrapper
            headerTitle={translate('common.date')}
            onBackButtonPress={navigateBack}
            shouldShowNotFoundPage={shouldShowNotFound}
            shouldShowWrapper
            testID="IOURequestStepDate"
            includeSafeAreaPaddingBottom
        >
            <FormProvider
                style={[styles.flexGrow1, styles.ph5]}
                formID={ONYXKEYS.FORMS.MONEY_REQUEST_DATE_FORM}
                onSubmit={updateDate}
                submitButtonText={translate('common.save')}
                enabledWhenOffline
                shouldHideFixErrorsAlert
                validate={validate}
            >
                <InputWrapper
                    InputComponent={DatePicker}
                    inputID={INPUT_IDS.MONEY_REQUEST_CREATED}
                    label={translate('common.date')}
                    defaultValue={currentCreated}
                    maxDate={CONST.CALENDAR_PICKER.MAX_DATE}
                    autoFocus
                />
            </FormProvider>
        </StepScreenWrapper>
    );
}

const IOURequestStepDateWithFullTransactionOrNotFound = withFullTransactionOrNotFound(IOURequestStepDate);

const IOURequestStepDateWithWritableReportOrNotFound = withWritableReportOrNotFound(IOURequestStepDateWithFullTransactionOrNotFound);

export default IOURequestStepDateWithWritableReportOrNotFound;

import OfflineWithFeedback from '@components/OfflineWithFeedback';
import {useSession} from '@components/OnyxListItemProvider';

import {useCurrencyListActions} from '@hooks/useCurrencyList';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearReportFieldKeyErrors, updateReportField} from '@libs/actions/Report';
import {resolveReportFieldValue} from '@libs/Formula';
import {
    getFieldViolation,
    getFieldViolationTranslation,
    getReportFieldKey,
    getReportFieldMaps,
    hasViolations as hasViolationsReportUtils,
    isGroupPolicyExpenseReport as isGroupPolicyExpenseReportUtils,
    isInvoiceReport as isInvoiceReportUtils,
    isReportFieldDisabled,
    isReportFieldDisabledForUser,
    shouldHideSingleReportField,
} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, PolicyReportField, Report, ReportViolationName} from '@src/types/onyx';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';

import type {ViewStyle} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';

import {isTrackIntentUserSelector} from '@selectors/Onboarding';
import React, {useMemo} from 'react';
import {View} from 'react-native';

import InlineReportFieldEditor from './InlineReportFieldEditor';

type MoneyRequestViewReportFieldsProps = {
    /** The report currently being looked at */
    report: OnyxEntry<Report>;

    /** Policy that the report belongs to */
    policy: OnyxEntry<Policy>;

    /** Indicates whether we have any pending actions from parent component */
    pendingAction?: PendingAction;
};

type EnrichedPolicyReportField = {
    fieldValue: string;
    isFieldDisabled: boolean;
    fieldKey: string;
    violation: ReportViolationName | undefined;
    violationTranslation: string;
} & PolicyReportField;

// Up to 3 fields fit per row on wide layouts; narrow layouts stack one field per row
const wideFieldWrapperStyle: ViewStyle = {flexBasis: '31%', flexGrow: 1, minWidth: 150};
const narrowFieldWrapperStyle: ViewStyle = {flexBasis: '100%'};

function MoneyRequestViewReportFields({report, policy, pendingAction}: MoneyRequestViewReportFieldsProps) {
    const styles = useThemeStyles();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const {getCurrencyDecimals} = useCurrencyListActions();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const session = useSession();
    const {isBetaEnabled} = usePermissions();
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [isTrackIntentUser] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED, {selector: isTrackIntentUserSelector});
    const [recentlyUsedReportFields] = useOnyx(ONYXKEYS.RECENTLY_USED_REPORT_FIELDS);

    const sortedPolicyReportFields = useMemo<EnrichedPolicyReportField[]>((): EnrichedPolicyReportField[] => {
        const {fieldValues, fieldsByName} = getReportFieldMaps(report, policy?.fieldList ?? {});
        const fields = Object.values(fieldsByName);

        return fields
            .filter((field) => field.target === report?.type)
            .filter((reportField) => !shouldHideSingleReportField(reportField))
            .sort(({orderWeight: firstOrderWeight}, {orderWeight: secondOrderWeight}) => firstOrderWeight - secondOrderWeight)
            .map((field): EnrichedPolicyReportField => {
                const fieldValue = resolveReportFieldValue(field, report, policy, fieldValues, fieldsByName, getCurrencyDecimals);
                const isFieldDisabled = isReportFieldDisabledForUser(report, field, policy, currentUserAccountID);
                const isDeletedFormulaField = field.type === CONST.REPORT_FIELD_TYPES.FORMULA && field.deletable;
                const fieldKey = getReportFieldKey(field.fieldID);

                const violation = isFieldDisabled ? undefined : getFieldViolation(field);
                const violationTranslation = getFieldViolationTranslation(field, violation);

                return {
                    ...field,
                    fieldValue,
                    isFieldDisabled: isFieldDisabled && !isDeletedFormulaField,
                    fieldKey,
                    violation,
                    violationTranslation,
                };
            });
    }, [policy, report, currentUserAccountID, getCurrencyDecimals]);

    const isGroupPolicyExpenseReport = isGroupPolicyExpenseReportUtils(report, policy?.type);
    const isInvoiceReport = isInvoiceReportUtils(report);

    const shouldDisplayReportFields = (isGroupPolicyExpenseReport || isInvoiceReport) && !!policy?.areReportFieldsEnabled;

    const saveReportFieldValue = (enrichedField: EnrichedPolicyReportField, newValue: string) => {
        const {fieldValue, isFieldDisabled, fieldKey, violation, violationTranslation, ...field} = enrichedField;
        const trimmedValue = newValue.trim();
        if (!report || isFieldDisabled || trimmedValue === '' || trimmedValue === (fieldValue ?? '').trim()) {
            return;
        }

        const hasViolations = hasViolationsReportUtils(report.reportID, transactionViolations, session?.accountID ?? CONST.DEFAULT_NUMBER_ID, session?.email ?? '');
        const hasOtherViolations =
            !!report.fieldList && Object.entries(report.fieldList).some(([key, listField]) => key !== fieldKey && listField.value === '' && !isReportFieldDisabled(report, field, policy));

        updateReportField({
            report: {...report, reportID: report.reportID},
            reportField: {...field, value: newValue},
            previousReportField: field,
            policy: policy as unknown as Policy,
            isASAPSubmitBetaEnabled: isBetaEnabled(CONST.BETAS.ASAP_SUBMIT),
            accountID: session?.accountID ?? CONST.DEFAULT_NUMBER_ID,
            email: session?.email ?? '',
            hasViolationsParam: hasViolations,
            recentlyUsedReportFields,
            shouldFixViolations: hasOtherViolations,
            isTrackIntentUser,
        });
    };

    if (!shouldDisplayReportFields || !sortedPolicyReportFields.length) {
        return null;
    }

    return (
        <View style={[styles.mb3, styles.ph5, styles.flexRow, styles.flexWrap, styles.gap3]}>
            {sortedPolicyReportFields.map((reportField) => (
                <OfflineWithFeedback
                    // Need to return undefined when we have pendingAction to avoid the duplicate pending action
                    pendingAction={pendingAction ? undefined : report?.pendingFields?.[reportField.fieldKey as keyof typeof report.pendingFields]}
                    errors={report?.errorFields?.[reportField.fieldKey]}
                    key={`inlineField-${reportField.fieldKey}`}
                    onClose={() => clearReportFieldKeyErrors(report?.reportID, reportField.fieldKey)}
                    style={shouldUseNarrowLayout ? narrowFieldWrapperStyle : wideFieldWrapperStyle}
                >
                    <InlineReportFieldEditor
                        field={reportField}
                        fieldValue={reportField.fieldValue}
                        isDisabled={reportField.isFieldDisabled}
                        errorText={reportField.violationTranslation}
                        onValueSaved={(newValue) => saveReportFieldValue(reportField, newValue)}
                    />
                </OfflineWithFeedback>
            ))}
        </View>
    );
}

export default MoneyRequestViewReportFields;

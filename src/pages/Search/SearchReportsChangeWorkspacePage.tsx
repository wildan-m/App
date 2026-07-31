import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {useSession} from '@components/OnyxListItemProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import {useSearchResultsContext, useSearchSelectionActions, useSearchSelectionContext} from '@components/Search/SearchContext';
import SelectionList from '@components/SelectionList';
import type {WorkspaceListItemType} from '@components/SelectionList/ListItem/types';
import UserListItem from '@components/SelectionList/ListItem/UserListItem';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import useWorkspaceList from '@hooks/useWorkspaceList';

import {changeReportPolicy, changeReportPolicyAndInviteSubmitter, moveIOUReportToPolicy, moveIOUReportToPolicyAndInviteSubmitter} from '@libs/actions/Report';
import Navigation from '@libs/Navigation/Navigation';
import {isPolicyAdmin, isPolicyMember} from '@libs/PolicyUtils';
import {
    getAllPolicyExpenseChatReportActions,
    getReportTransactions,
    hasViolations as hasViolationsReportUtils,
    isArchivedReport,
    isExpenseReport,
    isIOUReport,
    isSettled,
    isWorkspaceEligibleForReportChange,
} from '@libs/ReportUtils';
import {shouldRestrictUserBillableActions} from '@libs/SubscriptionUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Policy, Report} from '@src/types/onyx';

import {isTrackIntentUserSelector} from '@selectors/Onboarding';
import React, {useEffect, useMemo, useState} from 'react';
import Onyx from 'react-native-onyx';

function SearchReportsChangeWorkspacePage() {
    const {translate, localeCompare} = useLocalize();
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');
    const {selectedReports} = useSearchSelectionContext();
    const {clearSelectedTransactions} = useSearchSelectionActions();
    const {currentSearchResults} = useSearchResultsContext();
    const [selectedPolicyID, setSelectedPolicyID] = useState<string | undefined>(undefined);

    const session = useSession();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const {isBetaEnabled} = usePermissions();
    const isASAPSubmitBetaEnabled = isBetaEnabled(CONST.BETAS.ASAP_SUBMIT);

    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [allReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [allReportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
    const [allReportNameValuePairs] = useOnyx(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS);
    const [allNextSteps] = useOnyx(ONYXKEYS.COLLECTION.NEXT_STEP);
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [userBillingGracePeriods] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END);
    const [amountOwed] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);
    const [isTrackIntentUser] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED, {selector: isTrackIntentUserSelector});

    // Rows selected in Search live in the search snapshot, but the change-policy actions read the report,
    // its parent report and its report-preview action from Onyx. Copy anything the snapshot knows about
    // and Onyx doesn't, so the move has the same data the single-report flow has.
    useEffect(() => {
        const snapshotData = currentSearchResults?.data;
        if (!snapshotData) {
            return;
        }

        const onyxUpdates: Array<{
            onyxMethod: typeof Onyx.METHOD.MERGE;
            key: `${typeof ONYXKEYS.COLLECTION.REPORT}${string}`;
            value: Report;
        }> = [];

        for (const key of Object.keys(snapshotData)) {
            if (!key.startsWith(ONYXKEYS.COLLECTION.REPORT) || key.startsWith(ONYXKEYS.COLLECTION.REPORT_ACTIONS) || key.startsWith(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS)) {
                continue;
            }

            const typedKey = key as `${typeof ONYXKEYS.COLLECTION.REPORT}${string}`;
            if (allReports?.[typedKey]) {
                continue;
            }

            const report = snapshotData[typedKey];
            if (report) {
                onyxUpdates.push({
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: typedKey,
                    value: report,
                });
            }
        }

        if (onyxUpdates.length > 0) {
            Onyx.update(onyxUpdates);
        }
        // Hydration should only run once on mount using the initial snapshot data
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reportsToMove = useMemo(() => {
        const reports: Report[] = [];
        for (const selectedReport of selectedReports) {
            const report = selectedReport.reportID ? allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${selectedReport.reportID}`] : undefined;
            if (!report?.reportID) {
                continue;
            }
            reports.push(report);
        }
        return reports;
    }, [allReports, selectedReports]);

    const getSubmitterLogin = (report: Report) => personalDetails?.[report.ownerAccountID ?? CONST.DEFAULT_NUMBER_ID]?.login;

    const {data, shouldShowNoResultsFoundMessage, shouldShowSearchInput} = useWorkspaceList({
        policies,
        currentUserLogin: session?.email,
        shouldShowPendingDeletePolicy: false,
        selectedPolicyIDs: undefined,
        searchTerm: debouncedSearchTerm,
        localeCompare,
        // A workspace is only offered when every selected report can move to it, so confirming can never
        // silently skip part of the selection.
        additionalFilter: (newPolicy) =>
            reportsToMove.length > 0 &&
            reportsToMove.every((report) => {
                if (report.policyID === newPolicy?.id) {
                    return false;
                }
                const isEligible = isWorkspaceEligibleForReportChange(getSubmitterLogin(report), newPolicy, report);
                if (isSettled(report)) {
                    return isEligible && isPolicyAdmin(newPolicy, session?.email);
                }
                return isEligible;
            }),
    });

    const selectedPolicy = selectedPolicyID ? policies?.[`${ONYXKEYS.COLLECTION.POLICY}${selectedPolicyID}`] : undefined;

    const moveReportToPolicy = (report: Report, policy: Policy) => {
        const submitterLogin = getSubmitterLogin(report);
        const managerLogin = personalDetails?.[report.managerID ?? CONST.DEFAULT_NUMBER_ID]?.login;
        const parentReport = report.parentReportID ? allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${report.parentReportID}`] : undefined;
        const reportPreviewAction =
            report.parentReportID && report.parentReportActionID
                ? allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.parentReportID}`]?.[report.parentReportActionID]
                : undefined;
        const reportNextStep = allNextSteps?.[`${ONYXKEYS.COLLECTION.NEXT_STEP}${report.reportID}`];
        const isReportLastVisibleArchived = isArchivedReport(allReportNameValuePairs?.[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${report.parentReportID}`]);
        const hasViolations = hasViolationsReportUtils(report.reportID, transactionViolations, session?.accountID ?? CONST.DEFAULT_NUMBER_ID, session?.email ?? '');

        if (isIOUReport(report)) {
            const reportTransactions = getReportTransactions(report.reportID);
            const invite = moveIOUReportToPolicyAndInviteSubmitter(
                report,
                policy,
                getAllPolicyExpenseChatReportActions(allReports, allReportActions),
                reportPreviewAction,
                session?.accountID ?? CONST.DEFAULT_NUMBER_ID,
                submitterLogin,
                !!report.ownerAccountID && !!personalDetails?.[report.ownerAccountID],
                reportTransactions,
            );
            if (!invite?.policyExpenseChatReportID) {
                moveIOUReportToPolicy(report, policy, reportPreviewAction, false, reportTransactions);
            }
            return;
        }

        if (isExpenseReport(report) && isPolicyAdmin(policy) && report.ownerAccountID && !isPolicyMember(policy, submitterLogin)) {
            changeReportPolicyAndInviteSubmitter({
                report,
                parentReport,
                policy,
                currentUser: {
                    accountID: currentUserPersonalDetails.accountID,
                    displayName: currentUserPersonalDetails.displayName,
                    email: currentUserPersonalDetails.email,
                    avatar: currentUserPersonalDetails.avatar,
                },
                submitterLogin,
                managerLogin,
                hasViolationsParam: hasViolations,
                // The bulk confirmation dialog already explains what changing workspace does, and the
                // educational modal must not be pushed once per moved report.
                isChangePolicyTrainingModalDismissed: true,
                isASAPSubmitBetaEnabled,
                employeeList: policy?.employeeList,
                isReportLastVisibleArchived,
                reportNextStep,
                reportActionsList: getAllPolicyExpenseChatReportActions(allReports, allReportActions),
                reportPreviewAction,
                isTrackIntentUser,
            });
            return;
        }

        changeReportPolicy({
            report,
            parentReport,
            policy,
            currentUserAccountID: session?.accountID ?? CONST.DEFAULT_NUMBER_ID,
            email: session?.email ?? '',
            ownerLogin: submitterLogin,
            managerLogin,
            hasViolationsParam: hasViolations,
            isChangePolicyTrainingModalDismissed: true,
            isASAPSubmitBetaEnabled,
            reportNextStep,
            isReportLastVisibleArchived,
            reportPreviewAction,
            isTrackIntentUser,
        });
    };

    const confirmMove = () => {
        if (!selectedPolicy) {
            return;
        }

        for (const report of reportsToMove) {
            moveReportToPolicy(report, selectedPolicy);
        }

        setSelectedPolicyID(undefined);
        // Note: this clears both reports and transactions
        clearSelectedTransactions();
        Navigation.goBack();
    };

    const selectPolicy = (policyID?: string) => {
        const policy = policyID ? policies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`] : undefined;
        if (!policyID || !policy) {
            return;
        }
        if (shouldRestrictUserBillableActions(policy, ownerBillingGracePeriodEnd, userBillingGracePeriods, amountOwed, currentUserPersonalDetails.accountID)) {
            Navigation.navigate(ROUTES.RESTRICTED_ACTION.getRoute(policy.id));
            return;
        }
        setSelectedPolicyID(policyID);
    };

    const textInputOptions = {
        label: shouldShowSearchInput ? translate('common.search') : undefined,
        value: searchTerm,
        onChangeText: setSearchTerm,
        headerMessage: shouldShowNoResultsFoundMessage ? translate('common.noResultsFound') : '',
    };

    return (
        <ScreenWrapper
            testID="SearchReportsChangeWorkspacePage"
            includeSafeAreaPaddingBottom
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton title={translate('iou.changeWorkspace')} />
            <SelectionList<WorkspaceListItemType>
                ListItem={UserListItem}
                data={data}
                onSelectRow={(option) => selectPolicy(option.policyID)}
                textInputOptions={textInputOptions}
            />
            <ConfirmModal
                isVisible={!!selectedPolicy}
                title={translate('iou.changeWorkspace')}
                prompt={translate('search.bulkActions.moveReportsToWorkspaceConfirmation', {count: reportsToMove.length, workspaceName: selectedPolicy?.name ?? ''})}
                confirmText={translate('common.buttonConfirm')}
                cancelText={translate('common.cancel')}
                onConfirm={confirmMove}
                onCancel={() => setSelectedPolicyID(undefined)}
            />
        </ScreenWrapper>
    );
}

export default SearchReportsChangeWorkspacePage;

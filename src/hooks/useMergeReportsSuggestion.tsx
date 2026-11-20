import MergeReportsSuggestionModalContent from '@components/MergeReportsSuggestionModalContent';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import {usePersonalDetails} from '@components/OnyxListItemProvider';

import {mergeReports} from '@libs/actions/Report';
import {dismissProductTraining} from '@libs/actions/Welcome';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import Log from '@libs/Log';
import {getLoginByAccountID} from '@libs/PersonalDetailsUtils';
import {canMergeReports, doReportsHaveMatchingReportFieldValues, isReportExportedOrPending} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DismissedProductTraining, Transaction} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {isTrackIntentUserSelector} from '@selectors/Onboarding';
import React from 'react';

import {useCurrencyListActions} from './useCurrencyList';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useDelegateAccountID from './useDelegateAccountID';
import useExpenseEducationalModal from './useExpenseEducationalModal';
import useOnyx from './useOnyx';
import usePermissions from './usePermissions';
import {useGetPersonalDetailsByLogin} from './usePersonalDetailByLogin';
import usePersonalPolicy from './usePersonalPolicy';

type SuggestMergeBeforeMoveParams = {
    /** The report every selected expense currently sits on */
    sourceReportID: string | undefined;

    /** The report the user picked to move the expenses to */
    destinationReportID: string | undefined;

    /** The expenses the user selected to move */
    selectedTransactions: Transaction[];

    /** The search hash to update optimistically when merging from Search */
    hash?: number;

    /** Runs the move exactly as it works today */
    onMove: () => void;

    /** Runs after the reports were merged, e.g. to navigate to the merged report */
    onMerge: (destinationReportID: string) => void;
};

const mergeReportsSuggestionDismissedSelector = (nvpDismissedProductTraining: OnyxEntry<DismissedProductTraining>): boolean =>
    !!nvpDismissedProductTraining?.[CONST.MERGE_REPORTS_SUGGESTION_MODAL];

/**
 * When someone moves every expense off a report to another report they could merge it with, offers the merge once instead.
 * Otherwise the move runs as usual.
 */
function useMergeReportsSuggestion() {
    const showModal = useExpenseEducationalModal();
    const [isSuggestionDismissed] = useOnyx(ONYXKEYS.NVP_DISMISSED_PRODUCT_TRAINING, {selector: mergeReportsSuggestionDismissedSelector});
    const [allReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [allReportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
    const [allReportNameValuePairs] = useOnyx(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS);
    const [reportTransactionsAndViolations] = useOnyx(ONYXKEYS.DERIVED.REPORT_TRANSACTIONS_AND_VIOLATIONS);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [allPolicyCategories] = useOnyx(ONYXKEYS.COLLECTION.POLICY_CATEGORIES);
    const [allPolicyTags] = useOnyx(ONYXKEYS.COLLECTION.POLICY_TAGS);
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [bankAccountList] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST);
    const [rules] = useOnyx(ONYXKEYS.COLLECTION.RULE);
    const [cardList] = useOnyx(ONYXKEYS.CARD_LIST);
    const [isTrackIntentUser] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED, {selector: isTrackIntentUserSelector});
    const [selfDMReportID] = useOnyx(ONYXKEYS.SELF_DM_REPORT_ID);
    const [selfDMReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getNonEmptyStringOnyxID(selfDMReportID)}`);
    const {isBetaEnabled, isBetaEnabledOrUnknown} = usePermissions();
    const personalDetails = usePersonalDetails();
    const personalPolicy = usePersonalPolicy();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const delegateAccountID = useDelegateAccountID();
    const {getCurrencyDecimals, getCurrencySymbol} = useCurrencyListActions();
    const getPersonalDetailsByLogin = useGetPersonalDetailsByLogin();

    const canSuggestMerge = (sourceReportID: string | undefined, destinationReportID: string | undefined, selectedTransactions: Transaction[]): boolean => {
        if (isSuggestionDismissed || !isBetaEnabled(CONST.BETAS.REPORT_MERGE) || !sourceReportID || !destinationReportID || sourceReportID === destinationReportID) {
            return false;
        }
        if (selectedTransactions.length === 0 || selectedTransactions.some((transaction) => transaction.reportID !== sourceReportID)) {
            return false;
        }

        const sourceReport = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${sourceReportID}`];
        const destinationReport = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${destinationReportID}`];
        if (!sourceReport || !destinationReport) {
            return false;
        }

        // Only a move that empties the source report is a merge done by hand
        const sourceTransactions = Object.values(reportTransactionsAndViolations?.[sourceReportID]?.transactions ?? {}).filter(
            (transaction) => transaction?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
        );
        const sourceTransactionCount = sourceTransactions.length > 0 ? sourceTransactions.length : sourceReport.transactionCount;
        const selectedTransactionIDs = new Set(selectedTransactions.map((transaction) => transaction.transactionID));
        const areAllSourceTransactionsSelected =
            sourceTransactionCount === selectedTransactionIDs.size && sourceTransactions.every((transaction) => selectedTransactionIDs.has(transaction.transactionID));
        if (!areAllSourceTransactionsSelected) {
            return false;
        }

        const reports = [destinationReport, sourceReport];
        const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${destinationReport.policyID}`];
        const isExported = reports.some((report) => isReportExportedOrPending(allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.reportID}`] ?? [], report));

        return (
            !isExported &&
            doReportsHaveMatchingReportFieldValues(reports, policy) &&
            canMergeReports(reports, currentUserPersonalDetails.accountID, rules, getLoginByAccountID(destinationReport.ownerAccountID, personalDetails), allReportNameValuePairs, policy)
        );
    };

    const merge = (sourceReportID: string, destinationReportID: string, selectedTransactions: Transaction[], hash?: number) => {
        const policyID = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${destinationReportID}`]?.policyID;
        mergeReports({
            isVendorMatchingBetaEnabled: isBetaEnabledOrUnknown(CONST.BETAS.VENDOR_MATCHING),
            destinationReportID,
            sourceReportIDs: [sourceReportID],
            isASAPSubmitBetaEnabled: isBetaEnabled(CONST.BETAS.ASAP_SUBMIT),
            accountID: currentUserPersonalDetails.accountID ?? CONST.DEFAULT_NUMBER_ID,
            email: currentUserPersonalDetails.email ?? '',
            currentUserPersonalDetails,
            policy: policyID ? allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`] : undefined,
            policyCategories: policyID ? allPolicyCategories?.[`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${policyID}`] : undefined,
            policyTagList: policyID ? (allPolicyTags?.[`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`] ?? {}) : {},
            allTransactionViolation: transactionViolations,
            allReports,
            allReportActions: allReportActions ?? {},
            // Every expense on the source report is selected, so the selection is the source report's full expense list
            allReportsTransactions: {[sourceReportID]: selectedTransactions},
            bankAccountList,
            rules,
            cardList,
            hash,
            isTrackIntentUser,
            personalPolicyOutputCurrency: personalPolicy?.outputCurrency,
            selfDMReportActions,
            delegateAccountID,
            getCurrencyDecimals,
            getCurrencySymbol,
            personalDetailsByLogins: getPersonalDetailsByLogin(),
        });
    };

    const suggestMergeBeforeMove = ({sourceReportID, destinationReportID, selectedTransactions, hash, onMove, onMerge}: SuggestMergeBeforeMoveParams) => {
        if (!sourceReportID || !destinationReportID || !canSuggestMerge(sourceReportID, destinationReportID, selectedTransactions)) {
            onMove();
            return;
        }

        Log.info('[MergeReportsSuggestion] Suggestion shown');
        showModal(<MergeReportsSuggestionModalContent />).then(({action}) => {
            dismissProductTraining(CONST.MERGE_REPORTS_SUGGESTION_MODAL);
            if (action === ModalActions.CONFIRM) {
                Log.info('[MergeReportsSuggestion] Reports merged');
                merge(sourceReportID, destinationReportID, selectedTransactions, hash);
                onMerge(destinationReportID);
                return;
            }
            Log.info('[MergeReportsSuggestion] Moved anyway');
            onMove();
        });
    };

    return {suggestMergeBeforeMove};
}

export default useMergeReportsSuggestion;

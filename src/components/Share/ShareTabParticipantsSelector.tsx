import FullscreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import usePreferredPolicy from '@hooks/usePreferredPolicy';

import {clearMoneyRequest} from '@libs/actions/IOU/MoneyRequest';
import {saveUnknownUserDetails} from '@libs/actions/Share';
import Navigation from '@libs/Navigation/Navigation';
import {getPolicyExpenseChat} from '@libs/ReportUtils';
import {cancelSpan, getSpan, startSpan} from '@libs/telemetry/activeSpans';

import MoneyRequestParticipantsSelector from '@pages/iou/request/MoneyRequestParticipantsSelector';

import {getOptimisticChatReport, saveReportDraft} from '@userActions/Report';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {validTransactionDraftIDsSelector} from '@src/selectors/TransactionDraft';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React, {useEffect, useMemo, useRef, useState} from 'react';

type ShareTabParticipantsSelectorProps = {
    detailsPageRouteObject: typeof ROUTES.SHARE_SUBMIT_DETAILS | typeof ROUTES.SHARE_DETAILS;
};

function ShareTabParticipantsSelectorComponent({detailsPageRouteObject}: ShareTabParticipantsSelectorProps) {
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const [draftTransactionIDs] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_DRAFT, {selector: validTransactionDraftIDsSelector});
    const [allReports, allReportsMetadata] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [selectedReportID, setSelectedReportID] = useState<string | number | undefined>();
    const {isRestrictedToPreferredPolicy, preferredPolicyID} = usePreferredPolicy();

    const isSubmitFlow = detailsPageRouteObject === ROUTES.SHARE_SUBMIT_DETAILS;

    // The user's domain security group can lock submissions to a single workspace. Every other submit entry point skips the
    // destination picker in that case, so the share sheet has to resolve the same expense chat and go straight to confirmation.
    const shouldUsePreferredPolicy = isSubmitFlow && isRestrictedToPreferredPolicy && !!preferredPolicyID;
    const isResolvingPreferredPolicy = shouldUsePreferredPolicy && isLoadingOnyxValue(allReportsMetadata);
    const preferredPolicyExpenseChatReportID = useMemo(
        () => (shouldUsePreferredPolicy && !isResolvingPreferredPolicy ? getPolicyExpenseChat(currentUserAccountID, preferredPolicyID, allReports)?.reportID : undefined),
        [shouldUsePreferredPolicy, isResolvingPreferredPolicy, currentUserAccountID, preferredPolicyID, allReports],
    );

    // This span belongs to the submit flow, so the share flow instance must not cancel a span it never started. For the submit flow this cancels an attempt that closes before SubmitDetailsPage mounts to end the span, so it is
    useEffect(
        () => () => {
            if (!isSubmitFlow) {
                return;
            }
            cancelSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW);
        },
        [isSubmitFlow],
    );

    // Clearing the draft transaction updates Onyx, which re-runs this effect, so the navigation has to be fired only once.
    const hasNavigatedToPreferredPolicy = useRef(false);
    useEffect(() => {
        if (!preferredPolicyExpenseChatReportID || hasNavigatedToPreferredPolicy.current) {
            return;
        }
        hasNavigatedToPreferredPolicy.current = true;

        // clear the existing draft transaction from the previous flow to prevent the old data from being displayed
        clearMoneyRequest(CONST.IOU.OPTIMISTIC_TRANSACTION_ID, draftTransactionIDs);

        startSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW, {
            name: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
            op: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
            forceTransaction: true,
            attributes: {
                [CONST.TELEMETRY.ATTRIBUTE_REPORT_ID]: preferredPolicyExpenseChatReportID.toString(),
                [CONST.TELEMETRY.ATTRIBUTE_ROUTE_FROM]: Navigation.getActiveRoute() || 'unknown',
            },
        });

        setSelectedReportID(preferredPolicyExpenseChatReportID);
        Navigation.navigate(detailsPageRouteObject.getRoute(preferredPolicyExpenseChatReportID.toString()));
    }, [preferredPolicyExpenseChatReportID, draftTransactionIDs, detailsPageRouteObject]);

    // Never flash the destination picker at a user who is not allowed to pick a destination.
    if (isResolvingPreferredPolicy || !!preferredPolicyExpenseChatReportID) {
        return <FullscreenLoadingIndicator reasonAttributes={{context: 'ShareTabParticipantsSelector'}} />;
    }

    return (
        <MoneyRequestParticipantsSelector
            iouType={CONST.IOU.TYPE.SUBMIT}
            initiallySelectedReportID={typeof selectedReportID === 'string' ? selectedReportID : undefined}
            onParticipantsAdded={(value) => {
                // clear the existing draft transaction from the previous flow to prevent the old data from being displayed
                clearMoneyRequest(CONST.IOU.OPTIMISTIC_TRANSACTION_ID, draftTransactionIDs);

                const participant = value.at(0);
                let reportID = participant?.reportID ?? CONST.DEFAULT_NUMBER_ID;
                const accountID = participant?.accountID;

                if (isSubmitFlow) {
                    startSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW, {
                        name: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
                        op: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
                        forceTransaction: true,
                        attributes: {
                            [CONST.TELEMETRY.ATTRIBUTE_REPORT_ID]: reportID.toString(),
                            [CONST.TELEMETRY.ATTRIBUTE_ROUTE_FROM]: Navigation.getActiveRoute() || 'unknown',
                        },
                    });
                }

                if (accountID && !reportID) {
                    saveUnknownUserDetails(participant);
                    const optimisticReport = getOptimisticChatReport(accountID, currentUserAccountID);
                    reportID = optimisticReport.reportID;

                    if (isSubmitFlow) {
                        getSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW)?.setAttribute(CONST.TELEMETRY.ATTRIBUTE_REPORT_ID, reportID.toString());
                    }

                    setSelectedReportID(reportID);
                    saveReportDraft(reportID, optimisticReport).then(() => {
                        Navigation.navigate(detailsPageRouteObject.getRoute(reportID.toString()));
                    });
                } else {
                    setSelectedReportID(reportID);
                    Navigation.navigate(detailsPageRouteObject.getRoute(reportID.toString()));
                }
            }}
            action="create"
        />
    );
}

export default ShareTabParticipantsSelectorComponent;

import TransactionPreview from '@components/ReportActionItem/TransactionPreview';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import getReportRouteForCurrentContext from '@libs/Navigation/helpers/getReportRouteForCurrentContext';
import Navigation from '@libs/Navigation/Navigation';
import {getIOUReportIDFromReportActionPreview, isSplitBillAction, isTrackExpenseAction} from '@libs/ReportActionsUtils';

import {createTransactionThreadReport} from '@userActions/Report';

import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import type * as OnyxTypes from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

type ChatTransactionPreviewProps = {
    /** All the data of the action, used for showing context menu and deriving the IOU report */
    action: OnyxTypes.ReportAction;

    /** The ID of the current report where the preview is rendered */
    reportID: string | undefined;

    /** The ID of the report that owns this action (differs from reportID when reportActions are merged, e.g. a single-transaction report) */
    actionOwnerReportID: string | undefined;

    /** The chat report that owns the transaction */
    chatReport: OnyxEntry<OnyxTypes.Report>;

    /** The IOU report linked to this transaction, used when creating a transaction thread on demand */
    iouReport: OnyxEntry<OnyxTypes.Report>;

    /** Whether the preview should navigate to the split bill details screen on press */
    shouldShowSplitPreview: boolean;

    /** The ID of the transaction to preview */
    transactionID: string | undefined;
};

function ChatTransactionPreview({action, reportID, actionOwnerReportID, chatReport, iouReport, shouldShowSplitPreview, transactionID}: ChatTransactionPreviewProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const personalDetail = useCurrentUserPersonalDetails();
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [betas] = useOnyx(ONYXKEYS.BETAS);

    const reportPreviewStyles = StyleUtils.getMoneyRequestReportPreviewStyle(shouldUseNarrowLayout, 1, undefined, undefined);

    return (
        <View style={[styles.mt1, styles.w100]}>
            <TransactionPreview
                iouReportID={getIOUReportIDFromReportActionPreview(action)}
                chatReport={chatReport}
                reportID={reportID}
                action={action}
                isBillSplit={isSplitBillAction(action)}
                transactionID={transactionID}
                containerStyles={[reportPreviewStyles.transactionPreviewStandaloneStyle, styles.mt1]}
                transactionPreviewWidth={reportPreviewStyles.transactionPreviewStandaloneStyle.width}
                onPreviewPressed={() => {
                    if (shouldShowSplitPreview) {
                        // When the split action is owned by a different report than the one being viewed (merged
                        // single-transaction reports), pass that owner report ID so the split details screen looks
                        // the action up in the correct report instead of showing the Not Found page.
                        const splitActionReportID = actionOwnerReportID && actionOwnerReportID !== reportID ? actionOwnerReportID : undefined;
                        Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.SPLIT_BILL_DETAILS.getRoute(action.reportActionID, splitActionReportID)));
                        return;
                    }

                    // If no childReportID exists, create transaction thread on-demand
                    if (!action.childReportID) {
                        const createdTransactionThreadReport = createTransactionThreadReport({
                            introSelected,
                            currentUserLogin: personalDetail.email ?? '',
                            currentUserAccountID: personalDetail.accountID,
                            betas,
                            iouReport,
                            iouReportAction: action,
                        });
                        if (createdTransactionThreadReport?.reportID) {
                            Navigation.navigate(getReportRouteForCurrentContext({reportID: createdTransactionThreadReport.reportID}));
                            return;
                        }
                        return;
                    }

                    Navigation.navigate(getReportRouteForCurrentContext({reportID: action.childReportID}));
                }}
                isTrackExpense={isTrackExpenseAction(action)}
            />
        </View>
    );
}

export default ChatTransactionPreview;

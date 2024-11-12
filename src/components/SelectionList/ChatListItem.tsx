import React, {useMemo} from 'react';
import {View} from 'react-native';
import {AttachmentContext} from '@components/AttachmentContext';
import MentionReportContext from '@components/HTMLEngineProvider/HTMLRenderers/MentionReportRenderer/MentionReportContext';
import MultipleAvatars from '@components/MultipleAvatars';
import {ShowContextMenuContext} from '@components/ShowContextMenuContext';
import TextWithTooltip from '@components/TextWithTooltip';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import ReportActionItemDate from '@pages/home/report/ReportActionItemDate';
import ReportActionItemFragment from '@pages/home/report/ReportActionItemFragment';
import CONST from '@src/CONST';
import BaseListItem from './BaseListItem';
import type {ChatListItemProps, ListItem, ReportActionListItemType} from './types';
import ReportActionItem from '@pages/home/report/ReportActionItem';
import * as ReportUtils from '@libs/ReportUtils';
import { OnyxEntry, useOnyx } from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';
import useDeepCompareRef from '@hooks/useDeepCompareRef';
import * as ReportActionsUtils from '@libs/ReportActionsUtils';
import usePaginatedReportActions from '@hooks/usePaginatedReportActions';
import useNetwork from '@hooks/useNetwork';
import { isEmptyObject } from '@src/types/utils/EmptyObject';



function ChatListItem<TItem extends ListItem>({
    item,
    isFocused,
    showTooltip,
    isDisabled,
    canSelectMultiple,
    onSelectRow,
    onDismissError,
    onFocus,
    onLongPressRow,
    shouldSyncFocus,
}: ChatListItemProps<TItem>) {
    const reportActionItem = item as unknown as ReportActionListItemType;
    const from = reportActionItem.from;
    const icons = [
        {
            type: CONST.ICON_TYPE_AVATAR,
            source: from.avatar,
            name: reportActionItem.formattedFrom,
            id: from.accountID,
        },
    ];
    const styles = useThemeStyles();
    const theme = useTheme();
    const StyleUtils = useStyleUtils();

    const attachmentContextValue = {type: CONST.ATTACHMENT_TYPE.SEARCH};

    const contextValue = {
        anchor: null,
        report: undefined,
        reportNameValuePairs: undefined,
        action: undefined,
        transactionThreadReport: undefined,
        checkIfContextMenuActive: () => {},
        isDisabled: true,
    };

    const focusedBackgroundColor = styles.sidebarLinkActive.backgroundColor;
    const hoveredBackgroundColor = styles.sidebarLinkHover?.backgroundColor ? styles.sidebarLinkHover.backgroundColor : theme.sidebar;

    const mentionReportContextValue = useMemo(() => ({currentReportID: item?.reportID ?? '-1'}), [item.reportID]);
    const [reportOnyx, reportResult] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${item?.reportID}`, {allowStaleData: true});
    const permissions = useDeepCompareRef(reportOnyx?.permissions);

    /**
     * Create a lightweight Report so as to keep the re-rendering as light as possible by
     * passing in only the required props.
     *
     * Also, this plays nicely in contrast with Onyx,
     * which creates a new object every time collection changes. Because of this we can't
     * put this into onyx selector as it will be the same.
     */
    const report = useMemo(
        (): OnyxEntry<OnyxTypes.Report> =>
            reportOnyx && {
                lastReadTime: reportOnyx.lastReadTime,
                reportID: reportOnyx.reportID ?? '',
                policyID: reportOnyx.policyID,
                lastVisibleActionCreated: reportOnyx.lastVisibleActionCreated,
                statusNum: reportOnyx.statusNum,
                stateNum: reportOnyx.stateNum,
                writeCapability: reportOnyx.writeCapability,
                type: reportOnyx.type,
                errorFields: reportOnyx.errorFields,
                isPolicyExpenseChat: reportOnyx.isPolicyExpenseChat,
                parentReportID: reportOnyx.parentReportID,
                parentReportActionID: reportOnyx.parentReportActionID,
                chatType: reportOnyx.chatType,
                pendingFields: reportOnyx.pendingFields,
                isDeletedParentAction: reportOnyx.isDeletedParentAction,
                reportName: reportOnyx.reportName,
                description: reportOnyx.description,
                managerID: reportOnyx.managerID,
                total: reportOnyx.total,
                nonReimbursableTotal: reportOnyx.nonReimbursableTotal,
                fieldList: reportOnyx.fieldList,
                ownerAccountID: reportOnyx.ownerAccountID,
                currency: reportOnyx.currency,
                unheldTotal: reportOnyx.unheldTotal,
                participants: reportOnyx.participants,
                isWaitingOnBankAccount: reportOnyx.isWaitingOnBankAccount,
                iouReportID: reportOnyx.iouReportID,
                isOwnPolicyExpenseChat: reportOnyx.isOwnPolicyExpenseChat,
                isPinned: reportOnyx.isPinned,
                chatReportID: reportOnyx.chatReportID,
                visibility: reportOnyx.visibility,
                oldPolicyName: reportOnyx.oldPolicyName,
                policyName: reportOnyx.policyName,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                private_isArchived: reportOnyx.private_isArchived,
                isOptimisticReport: reportOnyx.isOptimisticReport,
                lastMentionedTime: reportOnyx.lastMentionedTime,
                avatarUrl: reportOnyx.avatarUrl,
                avatarFileName: reportOnyx.avatarFileName,
                permissions,
                invoiceReceiver: reportOnyx.invoiceReceiver,
                policyAvatar: reportOnyx.policyAvatar,
                pendingChatMembers: reportOnyx.pendingChatMembers,
            },
        [reportOnyx, permissions],
    );

    function getParentReportAction(parentReportActions: OnyxEntry<OnyxTypes.ReportActions>, parentReportActionID: string | undefined): OnyxEntry<OnyxTypes.ReportAction> {
        if (!parentReportActions || !parentReportActionID) {
            return;
        }
        return parentReportActions[parentReportActionID ?? '0'];
    }
    
    const [parentReportAction] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportOnyx?.parentReportID || -1}`, {
        canEvict: false,
        selector: (parentReportActions) => getParentReportAction(parentReportActions, reportOnyx?.parentReportActionID ?? ''),
    });
    const {reportActions, linkedAction, sortedAllReportActions, hasNewerActions, hasOlderActions} = usePaginatedReportActions(reportActionItem?.reportID, reportActionItem.reportActionID);
    const {isOffline} = useNetwork();

    const transactionThreadReportID = ReportActionsUtils.getOneTransactionThreadReportID(item?.reportID ?? '', reportActions ?? [], isOffline);

    const [transactionThreadReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${transactionThreadReportID ?? -1}`);
    const [transactionThreadReportActions = {}] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionThreadReportID}`);
    const allReportActions = ReportActionsUtils.getAllReportActions(transactionThreadReportID ?? '')
    const parentReportActionForTransactionThread = useMemo(
        () =>
            isEmptyObject(transactionThreadReportActions)
                ? undefined
                : (allReportActions.find((action) => action.reportActionID === transactionThreadReport?.parentReportActionID) as OnyxEntry<OnyxTypes.ReportAction> | undefined),
        [allReportActions, transactionThreadReportActions, transactionThreadReport?.parentReportActionID],
    );


    return <ReportActionItem
        // shouldHideThreadDividerLine={shouldHideThreadDividerLine}
        parentReportAction={parentReportAction}
        report={report}
        transactionThreadReport={transactionThreadReport}
        parentReportActionForTransactionThread={parentReportActionForTransactionThread}
        action={reportActionItem}
        reportActions={reportActions}
        // linkedReportActionID={linkedReportActionID}
        // displayAsGroup={displayAsGroup}
        displayAsGroup={false}
        // shouldDisplayNewMarker={shouldDisplayNewMarker}
        shouldDisplayNewMarker={false}
        shouldShowSubscriptAvatar={
            (ReportUtils.isPolicyExpenseChat(report) || ReportUtils.isInvoiceRoom(report)) &&
            [
                CONST.REPORT.ACTIONS.TYPE.IOU,
                CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW,
                CONST.REPORT.ACTIONS.TYPE.SUBMITTED,
                CONST.REPORT.ACTIONS.TYPE.APPROVED,
                CONST.REPORT.ACTIONS.TYPE.FORWARDED,
            ].some((type) => type === reportActionItem.actionName)
        }
        // isMostRecentIOUReportAction={reportActionItem.reportActionID === mostRecentIOUReportActionID}
        isMostRecentIOUReportAction={false}
        index={reportActionItem.index ?? 0}
        // isFirstVisibleReportAction={isFirstVisibleReportAction}
        isFirstVisibleReportAction={false}
        // shouldUseThreadDividerLine={shouldUseThreadDividerLine}
    />

    // return (
    //     <BaseListItem
    //         item={item}
    //         pressableStyle={[[styles.selectionListPressableItemWrapper, styles.textAlignLeft, item.isSelected && styles.activeComponentBG, item.cursorStyle]]}
    //         wrapperStyle={[styles.flexRow, styles.flex1, styles.justifyContentBetween, styles.userSelectNone]}
    //         containerStyle={styles.mb2}
    //         isFocused={isFocused}
    //         isDisabled={isDisabled}
    //         showTooltip={showTooltip}
    //         canSelectMultiple={canSelectMultiple}
    //         onLongPressRow={onLongPressRow}
    //         onSelectRow={onSelectRow}
    //         onDismissError={onDismissError}
    //         errors={item.errors}
    //         pendingAction={item.pendingAction}
    //         keyForList={item.keyForList}
    //         onFocus={onFocus}
    //         shouldSyncFocus={shouldSyncFocus}
    //         hoverStyle={item.isSelected && styles.activeComponentBG}
    //     >
    //         {(hovered) => (
    //             <MentionReportContext.Provider value={mentionReportContextValue}>
    //                 <ShowContextMenuContext.Provider value={contextValue}>
    //                     <AttachmentContext.Provider value={attachmentContextValue}>
    //                         <MultipleAvatars
    //                             icons={icons}
    //                             shouldShowTooltip={showTooltip}
    //                             secondAvatarStyle={[
    //                                 StyleUtils.getBackgroundAndBorderStyle(theme.sidebar),
    //                                 isFocused ? StyleUtils.getBackgroundAndBorderStyle(focusedBackgroundColor) : undefined,
    //                                 hovered && !isFocused ? StyleUtils.getBackgroundAndBorderStyle(hoveredBackgroundColor) : undefined,
    //                             ]}
    //                         />
    //                         <View style={[styles.chatItemRight]}>
    //                             <View style={[styles.chatItemMessageHeader]}>
    //                                 <View style={[styles.flexShrink1, styles.mr1]}>
    //                                     <TextWithTooltip
    //                                         shouldShowTooltip={showTooltip}
    //                                         text={reportActionItem.formattedFrom}
    //                                         style={[
    //                                             styles.chatItemMessageHeaderSender,
    //                                             isFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText,
    //                                             styles.sidebarLinkTextBold,
    //                                             styles.pre,
    //                                         ]}
    //                                     />
    //                                 </View>
    //                                 <ReportActionItemDate created={reportActionItem.created ?? ''} />
    //                             </View>
    //                             <View style={styles.chatItemMessage}>
    //                                 {reportActionItem.message.map((fragment, index) => (
    //                                     <ReportActionItemFragment
    //                                         // eslint-disable-next-line react/no-array-index-key
    //                                         key={`actionFragment-${reportActionItem.reportActionID}-${index}`}
    //                                         fragment={fragment}
    //                                         actionName={reportActionItem.actionName}
    //                                         source=""
    //                                         accountID={from.accountID}
    //                                         isFragmentContainingDisplayName={index === 0}
    //                                     />
    //                                 ))}
    //                             </View>
    //                         </View>
    //                     </AttachmentContext.Provider>
    //                 </ShowContextMenuContext.Provider>
    //             </MentionReportContext.Provider>
    //         )}
    //     </BaseListItem>
    // );
}

ChatListItem.displayName = 'ChatListItem';

export default ChatListItem;

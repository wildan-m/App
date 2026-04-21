import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import type {Ref} from 'react';
import type {SelectionListWithSectionsHandle} from '@components/SelectionList/SelectionListWithSections/types';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import usePreferredPolicy from '@hooks/usePreferredPolicy';
import useTransactionDraftValues from '@hooks/useTransactionDraftValues';
import getPlatform from '@libs/getPlatform';
import {isMovingTransactionFromTrackExpense} from '@libs/IOUUtils';
import type {Option} from '@libs/OptionsListUtils';
import {getActiveAdminWorkspaces, isPaidGroupPolicy as isPaidGroupPolicyUtil} from '@libs/PolicyUtils';
import {isInvoiceRoom} from '@libs/ReportUtils';
import {getInvoicePrimaryWorkspace} from '@userActions/Policy/Policy';
import type {IOUAction, IOUType} from '@src/CONST';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Participant} from '@src/types/onyx/IOU';
import ParticipantSearchResults, {sanitizedSelectedParticipant} from './ParticipantSearchResults';
import type {BillingData} from './ParticipantSearchResults';

type MoneyRequestParticipantsSelectorProps = {
    /** Callback to request parent modal to go to next step, which should be split */
    onFinish?: (value?: string, participants?: Participant[]) => void;

    /** Callback to add participants in MoneyRequestModal */
    onParticipantsAdded: (value: Participant[]) => void;

    /** Selected participants from MoneyRequestModal with login */
    participants?: Participant[] | typeof CONST.EMPTY_ARRAY;

    /** The type of IOU report, i.e. split, request, send, track */
    iouType: IOUType;

    /** The action of the IOU, i.e. create, split, move */
    action: IOUAction;

    /** Whether the IOU is workspaces only */
    isWorkspacesOnly?: boolean;

    /** Whether this is a per diem expense request */
    isPerDiemRequest?: boolean;

    /** Whether this is a time expense request */
    isTimeRequest?: boolean;

    /** Whether this is a corporate card transaction */
    isCorporateCardTransaction?: boolean;

    /** Reference to the outer element */
    ref?: Ref<InputFocusRef>;
};

type InputFocusRef = {
    focus?: () => void;
};

function MoneyRequestParticipantsSelector({
    participants = CONST.EMPTY_ARRAY,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onFinish = (_value?: string, _participants?: Participant[]) => {},
    onParticipantsAdded,
    iouType,
    action,
    isPerDiemRequest = false,
    isTimeRequest = false,
    isWorkspacesOnly = false,
    isCorporateCardTransaction = false,
    ref,
}: MoneyRequestParticipantsSelectorProps) {
    const platform = getPlatform();
    const isNative = platform === CONST.PLATFORM.ANDROID || platform === CONST.PLATFORM.IOS;
    const {isRestrictedToPreferredPolicy, preferredPolicyID} = usePreferredPolicy();
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`];
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const currentUserLogin = currentUserPersonalDetails.login;

    const [userBillingGracePeriodEnds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END);
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [amountOwed] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);
    const billingDataRef = useRef<BillingData>({userBillingGracePeriodEnds, ownerBillingGracePeriodEnd, amountOwed});
    useEffect(() => {
        billingDataRef.current = {userBillingGracePeriodEnds, ownerBillingGracePeriodEnd, amountOwed};
    });

    const [textInputAutoFocus, setTextInputAutoFocus] = useState<boolean>(!isNative);
    const selectionListRef = useRef<SelectionListWithSectionsHandle | null>(null);

    const isPaidGroupPolicy = isPaidGroupPolicyUtil(policy);
    const activeAdminWorkspaces = getActiveAdminWorkspaces(allPolicies, currentUserLogin);
    const isCategorizeOrShareAction = [CONST.IOU.ACTION.CATEGORIZE, CONST.IOU.ACTION.SHARE].some((option) => option === action);
    const [tryNewDot] = useOnyx(ONYXKEYS.NVP_TRY_NEW_DOT);
    const hasBeenAddedToNudgeMigration = !!tryNewDot?.nudgeMigration?.timestamp;
    const optimisticTransactions = useTransactionDraftValues();

    // This is necessary to prevent showing the Manager McTest when there are multiple transactions being created
    const hasMultipleTransactions = optimisticTransactions.length > 1;
    const canShowManagerMcTest = !hasBeenAddedToNudgeMigration && action !== CONST.IOU.ACTION.SUBMIT && !hasMultipleTransactions;

    /**
     * Adds a single participant to the expense
     */
    const addSingleParticipant = (option: Participant & Option) => {
        const newParticipants: Participant[] = [sanitizedSelectedParticipant(option, iouType)];

        if (iouType === CONST.IOU.TYPE.INVOICE) {
            const policyID = option.item && isInvoiceRoom(option.item) ? option.policyID : getInvoicePrimaryWorkspace(policy, activeAdminWorkspaces)?.id;
            newParticipants.push({
                policyID,
                isSender: true,
                selected: false,
                iouType,
            });
        }

        onParticipantsAdded(newParticipants);

        if (!option.isSelfDM) {
            onFinish(undefined, newParticipants);
        }
    };

    const getValidOptionsConfig = {
        selectedOptions: participants as Participant[],
        excludeLogins: CONST.EXPENSIFY_EMAILS_OBJECT,
        includeOwnedWorkspaceChats: iouType === CONST.IOU.TYPE.SUBMIT || iouType === CONST.IOU.TYPE.CREATE || iouType === CONST.IOU.TYPE.SPLIT || iouType === CONST.IOU.TYPE.TRACK,
        excludeNonAdminWorkspaces: action === CONST.IOU.ACTION.SHARE,
        includeP2P: !isCategorizeOrShareAction && !isPerDiemRequest && !isTimeRequest && !isCorporateCardTransaction,
        includeInvoiceRooms: iouType === CONST.IOU.TYPE.INVOICE,
        action,
        shouldSeparateSelfDMChat: iouType !== CONST.IOU.TYPE.INVOICE,
        shouldSeparateWorkspaceChat: true,
        includeSelfDM: !isMovingTransactionFromTrackExpense(action) && iouType !== CONST.IOU.TYPE.INVOICE,
        canShowManagerMcTest,
        isPerDiemRequest,
        isTimeRequest,
        showRBR: false,
        preferPolicyExpenseChat: isPaidGroupPolicy,
        preferRecentExpenseReports: action === CONST.IOU.ACTION.CREATE,
        isRestrictedToPreferredPolicy,
        preferredPolicyID,
    };

    useImperativeHandle(ref, () => ({
        focus: () => {
            if (!textInputAutoFocus) {
                return;
            }
            selectionListRef.current?.focusTextInput?.();
        },
    }));

    return (
        <ParticipantSearchResults
            iouType={iouType}
            action={action}
            participants={participants}
            isWorkspacesOnly={isWorkspacesOnly}
            isPerDiemRequest={isPerDiemRequest}
            isTimeRequest={isTimeRequest}
            isNative={isNative}
            canShowManagerMcTest={canShowManagerMcTest}
            getValidOptionsConfig={getValidOptionsConfig}
            allPolicies={allPolicies}
            billingDataRef={billingDataRef}
            selectionListRef={selectionListRef}
            textInputAutoFocus={textInputAutoFocus}
            setTextInputAutoFocus={setTextInputAutoFocus}
            addSingleParticipant={addSingleParticipant}
            onParticipantsAdded={onParticipantsAdded}
            onFinish={onFinish}
        />
    );
}

export default MoneyRequestParticipantsSelector;

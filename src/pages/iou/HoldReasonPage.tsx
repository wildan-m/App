import {getReportOwnerAccountID} from '@selectors/Report';
import React, {useCallback, useEffect, useState} from 'react';
import {useDelegateNoAccessActions, useDelegateNoAccessState} from '@components/DelegateNoAccessModalProvider';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HoldOrRejectEducationalModal from '@components/HoldOrRejectEducationalModal';
import HoldSubmitterEducationalModal from '@components/HoldSubmitterEducationalModal';
import useAncestors from '@hooks/useAncestors';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {putOnHold} from '@libs/actions/IOU/Hold';
import {setNameValuePair} from '@libs/actions/User';
import {addErrorMessage} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {MoneyRequestNavigatorParamList, SearchReportActionsParamList} from '@libs/Navigation/types';
import {getReportAction, isMoneyRequestAction} from '@libs/ReportActionsUtils';
import {canEditMoneyRequest, isDM, isReportInGroupPolicy} from '@libs/ReportUtils';
import {getFieldRequiredErrors} from '@libs/ValidationUtils';
import {clearErrorFields, clearErrors, setErrors} from '@userActions/FormActions';
import {dismissRejectUseExplanation} from '@userActions/IOU';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/MoneyRequestHoldReasonForm';
import HoldReasonFormView from './HoldReasonFormView';

type HoldReasonPageProps =
    | PlatformStackScreenProps<MoneyRequestNavigatorParamList, typeof SCREENS.MONEY_REQUEST.HOLD>
    | PlatformStackScreenProps<SearchReportActionsParamList, typeof SCREENS.SEARCH.TRANSACTION_HOLD_REASON_RHP>;

function HoldReasonPage({route}: HoldReasonPageProps) {
    const {translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const {transactionID, reportID, backTo} = route.params;

    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const ancestors = useAncestors(report);

    const [parentReportOwnerAccountID] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${report?.parentReportID}`, {selector: getReportOwnerAccountID});

    // We first check if the report is part of a policy - if not, then it's a personal request (1:1 request)
    // For personal requests, we need to allow both users to put the request on hold
    const isWorkspaceRequest = isReportInGroupPolicy(report);
    const isSubmitter = parentReportOwnerAccountID === currentUserAccountID;
    const parentReportAction = getReportAction(report?.parentReportID, report?.parentReportActionID);

    // Educational modal: check if the user has seen it before
    const [dismissedHoldUseExplanation] = useOnyx(ONYXKEYS.NVP_DISMISSED_HOLD_USE_EXPLANATION);
    const [dismissedRejectUseExplanation] = useOnyx(ONYXKEYS.NVP_DISMISSED_REJECT_USE_EXPLANATION);
    const [expenseReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${report?.parentReportID}`);
    const isExpenseReportDM = isDM(expenseReport);
    const isDismissed = isSubmitter ? dismissedHoldUseExplanation : dismissedRejectUseExplanation;
    const shouldShowEducationalModal = !isDismissed && !isExpenseReportDM;
    const [isEducationalModalVisible, setIsEducationalModalVisible] = useState(shouldShowEducationalModal);

    const dismissEducationalModal = useCallback(() => {
        setIsEducationalModalVisible(false);
        if (isSubmitter) {
            setNameValuePair(ONYXKEYS.NVP_DISMISSED_HOLD_USE_EXPLANATION, true, false);
        } else {
            dismissRejectUseExplanation();
        }
    }, [isSubmitter]);

    const {isDelegateAccessRestricted} = useDelegateNoAccessState();
    const {showDelegateNoAccessModal} = useDelegateNoAccessActions();
    const onSubmit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MONEY_REQUEST_HOLD_FORM>) => {
        if (isDelegateAccessRestricted) {
            showDelegateNoAccessModal();
            return;
        }

        // We have extra isWorkspaceRequest condition since, for 1:1 requests, canEditMoneyRequest will rightly return false
        // as we do not allow requestee to edit fields like description and amount.
        // But, we still want the requestee to be able to put the request on hold
        if (isMoneyRequestAction(parentReportAction) && !canEditMoneyRequest(parentReportAction) && isWorkspaceRequest) {
            return;
        }

        putOnHold(transactionID, values.comment, reportID, ancestors);
        Navigation.goBack(backTo);
    };

    const validate = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MONEY_REQUEST_HOLD_FORM>) => {
            const errors: FormInputErrors<typeof ONYXKEYS.FORMS.MONEY_REQUEST_HOLD_FORM> = getFieldRequiredErrors(values, [INPUT_IDS.COMMENT], translate);

            if (!values.comment) {
                errors.comment = translate('common.error.fieldRequired');
            }
            // We have extra isWorkspaceRequest condition since, for 1:1 requests, canEditMoneyRequest will rightly return false
            // as we do not allow requestee to edit fields like description and amount.
            // But, we still want the requestee to be able to put the request on hold
            if (isMoneyRequestAction(parentReportAction) && !canEditMoneyRequest(parentReportAction) && isWorkspaceRequest) {
                const formErrors = {};
                addErrorMessage(formErrors, 'reportModified', translate('common.error.requestModified'));
                setErrors(ONYXKEYS.FORMS.MONEY_REQUEST_HOLD_FORM, formErrors);
            }

            return errors;
        },
        [parentReportAction, isWorkspaceRequest, translate],
    );

    useEffect(() => {
        clearErrors(ONYXKEYS.FORMS.MONEY_REQUEST_HOLD_FORM);
        clearErrorFields(ONYXKEYS.FORMS.MONEY_REQUEST_HOLD_FORM);
    }, []);

    if (isEducationalModalVisible) {
        if (isSubmitter) {
            return (
                <HoldSubmitterEducationalModal
                    onClose={() => Navigation.goBack(backTo)}
                    onConfirm={dismissEducationalModal}
                />
            );
        }
        return (
            <HoldOrRejectEducationalModal
                onClose={() => Navigation.goBack(backTo)}
                onConfirm={dismissEducationalModal}
            />
        );
    }

    return (
        <HoldReasonFormView
            onSubmit={onSubmit}
            validate={validate}
            backTo={backTo}
            isSubmitter={isSubmitter}
        />
    );
}

export default HoldReasonPage;

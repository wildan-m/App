import CheckboxWithLabel from '@components/CheckboxWithLabel';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import Text from '@components/Text';
import TextLink from '@components/TextLink';

import Navigation from '@libs/Navigation/Navigation';
import {buildCannedSearchQuery} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import useConfirmModal from './useConfirmModal';
import useLocalize from './useLocalize';
import useThemeStyles from './useThemeStyles';

type UseCreateEmptyReportConfirmationParams = {
    /** The policy ID for which the report is being created */
    policyID?: string;
    /** The display name of the policy/workspace */
    policyName?: string;
    /** Callback function to execute when user confirms report creation */
    onConfirm: (shouldDismissEmptyReportsConfirmation: boolean) => void;
    /** Optional callback function to execute when user cancels the confirmation */
    onCancel?: () => void;
    /** Whether the modal should push a history entry so browser-back dismisses it (default: true) */
    shouldHandleNavigationBack?: boolean;
};

type UseCreateEmptyReportConfirmationResult = {
    /** Function to open the confirmation modal */
    openCreateReportConfirmation: () => void;
};

function ConfirmationPrompt({workspaceName, checkboxRef, onLinkPress}: {workspaceName: string; checkboxRef: React.RefObject<boolean>; onLinkPress: () => void}) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [isChecked, setIsChecked] = useState(false);

    return (
        <View style={styles.gap4}>
            <Text>
                {translate('report.newReport.emptyReportConfirmationPrompt', {workspaceName})} <TextLink onPress={onLinkPress}>{translate('search.tabs.reports')}.</TextLink>
            </Text>
            <CheckboxWithLabel
                accessibilityLabel={translate('report.newReport.emptyReportConfirmationDontShowAgain')}
                label={translate('report.newReport.emptyReportConfirmationDontShowAgain')}
                isChecked={isChecked}
                onInputChange={(value) => {
                    const checked = !!value;
                    setIsChecked(checked);
                    // eslint-disable-next-line no-param-reassign
                    checkboxRef.current = checked;
                }}
            />
        </View>
    );
}

export default function useCreateEmptyReportConfirmation({
    policyName,
    onConfirm,
    onCancel,
    shouldHandleNavigationBack = true,
}: UseCreateEmptyReportConfirmationParams): UseCreateEmptyReportConfirmationResult {
    const {translate} = useLocalize();
    const {showConfirmModal, closeModal} = useConfirmModal();
    const workspaceDisplayName = policyName?.trim().length ? policyName : translate('report.newReport.genericWorkspaceName');

    // Keep the latest values in a ref so `openCreateReportConfirmation` can stay referentially stable.
    // `showConfirmModal`/`closeModal` come from the modal context, whose value is recreated on every
    // modal-stack change; without this indirection the returned callback would change identity on every
    // render and any caller that lists it in a useEffect dependency array would re-open the modal in an
    // infinite loop ("Maximum update depth exceeded").
    const latestValuesRef = useRef({onConfirm, onCancel, showConfirmModal, closeModal, translate, workspaceDisplayName, shouldHandleNavigationBack});
    useEffect(() => {
        latestValuesRef.current = {onConfirm, onCancel, showConfirmModal, closeModal, translate, workspaceDisplayName, shouldHandleNavigationBack};
    }, [onConfirm, onCancel, showConfirmModal, closeModal, translate, workspaceDisplayName, shouldHandleNavigationBack]);

    const openCreateReportConfirmation = useCallback(() => {
        const {
            showConfirmModal: showConfirmModalFn,
            closeModal: closeModalFn,
            translate: translateFn,
            workspaceDisplayName: workspaceName,
            shouldHandleNavigationBack: handleNavigationBack,
        } = latestValuesRef.current;

        const checkboxRef = {current: false};

        const handleLinkPress = () => {
            closeModalFn();
            Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: buildCannedSearchQuery({type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT})}));
        };

        showConfirmModalFn({
            // Adding a space at the end because of this bug in react-native: https://github.com/facebook/react-native/issues/53286
            title: `${translateFn('report.newReport.emptyReportConfirmationTitle')} `,
            confirmText: translateFn('report.newReport.createReport'),
            cancelText: translateFn('common.cancel'),
            shouldHandleNavigationBack: handleNavigationBack,
            prompt: (
                <ConfirmationPrompt
                    workspaceName={workspaceName}
                    checkboxRef={checkboxRef}
                    onLinkPress={handleLinkPress}
                />
            ),
        }).then((result) => {
            if (result.action === ModalActions.CONFIRM) {
                latestValuesRef.current.onConfirm(checkboxRef.current);
            } else {
                latestValuesRef.current.onCancel?.();
            }
        });
    }, []);

    return {
        openCreateReportConfirmation,
    };
}

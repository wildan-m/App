import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import type {ValueOf} from 'type-fest';
import Button from '@components/Button';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import RadioListItem from '@components/SelectionList/ListItem/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';
import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import usePermissions from '@hooks/usePermissions';
import usePolicy from '@hooks/usePolicy';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateGustoApprovalMode} from '@libs/actions/connections/Gusto';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type ApprovalModeOption = ListItem & {
    value: ValueOf<typeof CONST.GUSTO.APPROVAL_MODE>;
};

type GustoApprovalModePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.HR_GUSTO_APPROVAL_MODE>;

function GustoApprovalModePage({
    route: {
        params: {policyID},
    },
}: GustoApprovalModePageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {showConfirmModal} = useConfirmModal();
    const {isBetaEnabled} = usePermissions();
    const policy = usePolicy(policyID);
    const currentApprovalMode = policy?.connections?.gusto?.config?.approvalMode ?? CONST.GUSTO.APPROVAL_MODE.BASIC;
    const [selectedApprovalMode, setSelectedApprovalMode] = useState(currentApprovalMode);

    useEffect(() => {
        setSelectedApprovalMode(currentApprovalMode);
    }, [currentApprovalMode]);

    const data: ApprovalModeOption[] = Object.values(CONST.GUSTO.APPROVAL_MODE).map((approvalMode) => ({
        value: approvalMode,
        keyForList: approvalMode,
        text: translate(`workspace.hr.gusto.approvalModes.${approvalMode}` as TranslationPaths),
        alternateText: translate(`workspace.hr.gusto.approvalModeDescriptions.${approvalMode}` as TranslationPaths),
        isSelected: selectedApprovalMode === approvalMode,
    }));

    const saveApprovalMode = useCallback(async () => {
        if (selectedApprovalMode === currentApprovalMode) {
            Navigation.goBack(ROUTES.WORKSPACE_HR.getRoute(policyID));
            return;
        }

        const result = await showConfirmModal({
            title: translate('workspace.hr.gusto.approvalModeWarningTitle'),
            prompt: translate('workspace.hr.gusto.approvalModeWarningPrompt'),
            confirmText: translate('common.save'),
            cancelText: translate('common.cancel'),
            shouldSetModalVisibility: false,
        });

        if (result.action !== ModalActions.CONFIRM) {
            return;
        }

        updateGustoApprovalMode(policyID, selectedApprovalMode, policy?.connections?.gusto?.config?.approvalMode ?? null);
        Navigation.goBack(ROUTES.WORKSPACE_HR.getRoute(policyID));
    }, [currentApprovalMode, policy?.connections?.gusto?.config?.approvalMode, policyID, selectedApprovalMode, showConfirmModal, translate]);

    const footer = useMemo(
        () => (
            <View style={[styles.ph5, styles.pb5, styles.pt3]}>
                <Button
                    success
                    text={translate('common.save')}
                    onPress={saveApprovalMode}
                    isDisabled={selectedApprovalMode === currentApprovalMode}
                />
            </View>
        ),
        [currentApprovalMode, saveApprovalMode, selectedApprovalMode, styles.pb5, styles.ph5, styles.pt3, translate],
    );

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.IS_HR_ENABLED}
            shouldBeBlocked={!isBetaEnabled(CONST.BETAS.GUSTO) || (policy !== undefined && !policy?.connections?.gusto)}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                testID="GustoApprovalModePage"
            >
                <HeaderWithBackButton
                    title={translate('workspace.hr.gusto.approvalMode')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACE_HR.getRoute(policyID))}
                />
                <View style={styles.ph5}>
                    <Text style={[styles.pb5, styles.textNormal]}>{translate('workspace.hr.gusto.approvalModeDescription')}</Text>
                </View>
                <OfflineWithFeedback
                    pendingAction={policy?.connections?.gusto?.config?.pendingFields?.approvalMode}
                    style={styles.flex1}
                    contentContainerStyle={styles.flex1}
                >
                    <SelectionList
                        data={data}
                        ListItem={RadioListItem}
                        onSelectRow={(selection) => setSelectedApprovalMode((selection as ApprovalModeOption).value)}
                        initiallyFocusedItemKey={data.find((option) => option.isSelected)?.keyForList}
                        listFooterContent={footer}
                        showScrollIndicator
                        shouldUpdateFocusedIndex
                        alternateNumberOfSupportedLines={2}
                        addBottomSafeAreaPadding
                    />
                </OfflineWithFeedback>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default GustoApprovalModePage;

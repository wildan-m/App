import ConfirmationPage from '@components/ConfirmationPage';
import ScreenWrapper from '@components/ScreenWrapper';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import Navigation from '@navigation/Navigation';

import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';

import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

import React from 'react';

type WorkspaceCompanyCardsBulkTransactionStartDateSuccessPageProps = PlatformStackScreenProps<
    SettingsNavigatorParamList,
    typeof SCREENS.WORKSPACE.COMPANY_CARDS_BULK_TRANSACTION_START_DATE_SUCCESS
>;

function WorkspaceCompanyCardsBulkTransactionStartDateSuccessPage({route}: WorkspaceCompanyCardsBulkTransactionStartDateSuccessPageProps) {
    const {policyID} = route.params;
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['CheckmarkCircle']);

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_COMPANY_CARDS_ENABLED}
            policyFeature={CONST.POLICY.POLICY_FEATURE.COMPANY_CARDS}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
        >
            <ScreenWrapper
                testID="WorkspaceCompanyCardsBulkTransactionStartDateSuccessPage"
                enableEdgeToEdgeBottomSafeAreaPadding
            >
                <ConfirmationPage
                    illustration={illustrations.CheckmarkCircle}
                    heading={translate('workspace.companyCards.bulkStartDateUpdated')}
                    description={translate('workspace.companyCards.bulkStartDateUpdatedDescription')}
                    descriptionStyle={[styles.ph4, styles.textSupporting]}
                    shouldShowButton
                    buttonText={translate('common.buttonConfirm')}
                    onButtonPress={() => Navigation.closeRHPFlow()}
                    containerStyle={styles.h100}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default WorkspaceCompanyCardsBulkTransactionStartDateSuccessPage;

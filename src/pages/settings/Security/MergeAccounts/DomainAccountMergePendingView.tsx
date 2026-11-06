import ConfirmationPage from '@components/ConfirmationPage';
import FixedFooter from '@components/FixedFooter';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import {cancelDomainAccountMergeRequest, clearDomainAccountMergeRequestErrors} from '@userActions/MergeAccounts';

import CONST from '@src/CONST';
import type {DomainAccountMergeRequest} from '@src/types/onyx';

import React, {useEffect} from 'react';
import {View} from 'react-native';

type DomainAccountMergePendingViewProps = {
    /** The requester's outstanding request */
    request: DomainAccountMergeRequest;

    /** Login of the account the request would merge into */
    targetLogin: string;
};

function DomainAccountMergePendingView({request, targetLogin}: DomainAccountMergePendingViewProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const lazyIllustrations = useMemoizedLazyIllustrations(['LockClosedOrange']);
    const {requestID, sourceLogin} = request;
    const isCancelling = request.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
    const hasErrors = !!request.errors;

    useEffect(() => {
        if (!hasErrors) {
            return;
        }
        return () => clearDomainAccountMergeRequestErrors(requestID);
    }, [hasErrors, requestID]);

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom
            testID="DomainAccountMergePendingView"
        >
            <HeaderWithBackButton
                title={translate('mergeAccountsPage.mergeAccount')}
                onBackButtonPress={() => Navigation.dismissModal()}
            />
            <ConfirmationPage style={styles.mt3}>
                <ConfirmationPage.Content requestErrors={request.errors}>
                    <ConfirmationPage.Illustration illustration={lazyIllustrations.LockClosedOrange} />
                    <ConfirmationPage.Heading>{translate('mergeAccountsPage.domainAccountMergeRequest.heading')}</ConfirmationPage.Heading>
                    <View style={[styles.renderHTML, styles.textAlignCenter, styles.alignItemsCenter, styles.w100]}>
                        <RenderHTML html={translate('mergeAccountsPage.domainAccountMergeRequest.description', sourceLogin, targetLogin)} />
                    </View>
                </ConfirmationPage.Content>
                <FixedFooter>
                    <ConfirmationPage.SecondaryButton
                        text={translate('mergeAccountsPage.domainAccountMergeRequest.cancelRequest')}
                        isLoading={isCancelling}
                        isDisabled={!isCancelling && isOffline}
                        onPress={() => cancelDomainAccountMergeRequest(requestID)}
                    />
                    <ConfirmationPage.PrimaryButton
                        text={translate('common.buttonConfirm')}
                        onPress={() => Navigation.dismissModal()}
                    />
                </FixedFooter>
            </ConfirmationPage>
        </ScreenWrapper>
    );
}

export default DomainAccountMergePendingView;

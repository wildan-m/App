import Button from '@components/ButtonComposed';
import FixedFooter from '@components/FixedFooter';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import {loadExpensifyIcon} from '@components/Icon/ExpensifyIconLoader';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import {useMemoizedLazyAsset} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspacesDomainModalNavigatorParamList} from '@libs/Navigation/types';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';

import {clearDomainAdminshipRequestError, openDomainPage, requestDomainAdminship} from '@userActions/Domain';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {domainNameSelector} from '@src/selectors/Domain';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React, {useEffect} from 'react';
import {View} from 'react-native';

type DomainAccessRestrictedPageProps = PlatformStackScreenProps<WorkspacesDomainModalNavigatorParamList, typeof SCREENS.WORKSPACES_DOMAIN_ACCESS_RESTRICTED>;

const FEATURES: TranslationPaths[] = [
    'domain.accessRestricted.companyCardManagement',
    'domain.accessRestricted.accountCreationAndDeletion',
    'domain.accessRestricted.workspaceCreation',
    'domain.accessRestricted.samlSSO',
];

function DomainAccessRestrictedPage({route}: DomainAccessRestrictedPageProps) {
    const {asset: Checkmark} = useMemoizedLazyAsset(() => loadExpensifyIcon('Checkmark'));
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate} = useLocalize();

    const {domainAccountID} = route.params;
    const [domainName, domainNameResults] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {selector: domainNameSelector});
    const [adminshipRequest] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ADMINSHIP_REQUEST}${domainAccountID}`);
    const hasRequestedAccess = !!adminshipRequest?.requested;

    // Refresh the pending request state so a returning requester sees the current outcome
    useEffect(() => {
        openDomainPage(domainAccountID);
    }, [domainAccountID]);

    const isDomainNameLoading = isLoadingOnyxValue(domainNameResults);
    if (isDomainNameLoading) {
        const reasonAttributes: SkeletonSpanReasonAttributes = {
            context: 'DomainAccessRestrictedPage',
            isDomainNameLoading,
        };
        return <FullScreenLoadingIndicator reasonAttributes={reasonAttributes} />;
    }

    if (!domainName) {
        return <NotFoundPage onLinkPress={() => Navigation.dismissModal()} />;
    }

    return (
        <ScreenWrapper testID="DomainAccessRestrictedPage">
            <HeaderWithBackButton
                title={translate('domain.accessRestricted.title')}
                onBackButtonPress={Navigation.goBack}
            />
            <ScrollView
                contentContainerStyle={[styles.flexGrow1, styles.pt3, styles.ph5, styles.gap5]}
                keyboardShouldPersistTaps="always"
            >
                <View style={styles.flexRow}>
                    <RenderHTML html={translate('domain.accessRestricted.subtitle', domainName)} />
                </View>

                <View style={styles.gap2}>
                    {FEATURES.map((featureTranslationPath) => (
                        <View
                            style={[styles.alignItemsCenter, styles.flexRow]}
                            key={featureTranslationPath}
                        >
                            <Icon
                                src={Checkmark}
                                additionalStyles={styles.mr2}
                                fill={theme.iconSuccessFill}
                            />
                            <Text>{translate(featureTranslationPath)}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
            <FixedFooter style={styles.gap3}>
                <OfflineWithFeedback
                    pendingAction={adminshipRequest?.pendingAction}
                    errors={adminshipRequest?.errors}
                    errorRowStyles={styles.mt2}
                    onClose={() => clearDomainAdminshipRequestError(domainAccountID)}
                >
                    <Button
                        variant={CONST.BUTTON_VARIANT.SUCCESS}
                        size={CONST.BUTTON_SIZE.LARGE}
                        isDisabled={hasRequestedAccess}
                        onPress={() => requestDomainAdminship(domainAccountID, domainName)}
                    >
                        <Button.Text>{translate(hasRequestedAccess ? 'domain.accessRestricted.requestSent' : 'domain.accessRestricted.requestAccess')}</Button.Text>
                    </Button>
                </OfflineWithFeedback>
                <Button
                    size={CONST.BUTTON_SIZE.LARGE}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACES_VERIFY_DOMAIN.getRoute(domainAccountID))}
                >
                    <Button.Text>{translate('common.verify')}</Button.Text>
                </Button>
            </FixedFooter>
        </ScreenWrapper>
    );
}

export default DomainAccessRestrictedPage;

import React, {useEffect} from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';
import ValidateCodeActionContent from '@components/ValidateCodeActionModal/ValidateCodeActionContent';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {
    clearContactMethodErrors,
    requestValidateCodeAction,
    resetValidateActionCodeSent,
    setContactMethodAsDefault,
    updateIsVerifiedValidateActionCode,
    verifySetContactMethodAsDefaultCode,
} from '@libs/actions/User';
import {getLatestErrorField} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {getContactMethod} from '@libs/UserUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import getDecodedContactMethodFromUriParam from './utils';

type SetDefaultContactMethodConfirmMagicCodePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.PROFILE.CONTACT_METHOD_SET_DEFAULT_CONFIRM>;

function SetDefaultContactMethodConfirmMagicCodePage({route}: SetDefaultContactMethodConfirmMagicCodePageProps) {
    const {translate, formatPhoneNumber} = useLocalize();
    const backTo = route.params?.backTo;
    const contactMethod = getDecodedContactMethodFromUriParam(route.params.contactMethod);
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [loginList] = useOnyx(ONYXKEYS.LOGIN_LIST);
    const [pendingContactAction] = useOnyx(ONYXKEYS.PENDING_CONTACT_ACTION);
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const primaryContactMethod = getContactMethod(account?.primaryLogin, session?.email);

    const loginData = loginList?.[contactMethod];
    const defaultLoginError = getLatestErrorField(loginData, 'defaultLogin');

    // Reset verification state on mount so a previous successful set-as-default flow does not leak in
    // and short-circuit verification for this attempt.
    useEffect(() => {
        updateIsVerifiedValidateActionCode(false);
    }, []);

    // Once verification succeeds, fire the actual set-as-default mutation with the validated code. The
    // existing session.email effect below handles the post-success navigation.
    useEffect(() => {
        if (!pendingContactAction?.isVerifiedValidateActionCode || !pendingContactAction?.validateActionCode) {
            return;
        }
        setContactMethodAsDefault(currentUserPersonalDetails, contactMethod, formatPhoneNumber, backTo, true, pendingContactAction.validateActionCode);
        updateIsVerifiedValidateActionCode(false);
    }, [pendingContactAction?.isVerifiedValidateActionCode, pendingContactAction?.validateActionCode, currentUserPersonalDetails, contactMethod, formatPhoneNumber, backTo]);

    // Navigate back to contact methods list when the default login is successfully updated
    useEffect(() => {
        // Wait for the server to confirm the default login change (session.email is updated via successData)
        if (session?.email !== contactMethod || loginData?.pendingFields?.defaultLogin) {
            return;
        }

        resetValidateActionCodeSent();
        Navigation.goBack(ROUTES.SETTINGS_CONTACT_METHODS.getRoute(backTo));
    }, [session?.email, contactMethod, loginData?.pendingFields?.defaultLogin, backTo]);

    useEffect(() => {
        return () => {
            clearContactMethodErrors(contactMethod, 'defaultLogin');
            updateIsVerifiedValidateActionCode(false);
        };
    }, [contactMethod]);

    if (!contactMethod || !loginData) {
        return (
            <ScreenWrapper testID="SetDefaultContactMethodConfirmMagicCodePage">
                <FullPageNotFoundView
                    shouldShow
                    linkTranslationKey="contacts.goBackContactMethods"
                    onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_CONTACT_METHODS.getRoute(backTo))}
                    onLinkPress={() => Navigation.goBack(ROUTES.SETTINGS_CONTACT_METHODS.getRoute(backTo))}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ValidateCodeActionContent
            title={translate('delegate.makeSureItIsYou')}
            sendValidateCode={() => requestValidateCodeAction()}
            descriptionPrimary={translate('contacts.enterMagicCode', primaryContactMethod)}
            validateCodeActionErrorField="defaultLogin"
            validateError={defaultLoginError}
            handleSubmitForm={(validateCode) => verifySetContactMethodAsDefaultCode(contactMethod, validateCode)}
            isLoading={!!pendingContactAction?.isLoading || !!loginData?.pendingFields?.defaultLogin}
            clearError={() => {
                clearContactMethodErrors(contactMethod, 'defaultLogin');
            }}
            onClose={() => {
                resetValidateActionCodeSent();
                updateIsVerifiedValidateActionCode(false);
                Navigation.goBack(ROUTES.SETTINGS_CONTACT_METHOD_DETAILS.getRoute(contactMethod, backTo));
            }}
        />
    );
}

export default SetDefaultContactMethodConfirmMagicCodePage;

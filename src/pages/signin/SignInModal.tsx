import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {useSession} from '@components/OnyxListItemProvider';
import ScreenWrapper from '@components/ScreenWrapper';

import useAndroidBackButtonHandler from '@hooks/useAndroidBackButtonHandler';
import useOnyx from '@hooks/useOnyx';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';

import {openApp} from '@libs/actions/App';
import {isMobileSafari} from '@libs/Browser';
import isReportTopmostSplitNavigator from '@libs/Navigation/helpers/isReportTopmostSplitNavigator';
import Navigation from '@libs/Navigation/Navigation';
import {waitForIdle} from '@libs/Network/SequentialQueue';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import React, {useCallback, useEffect, useMemo, useRef} from 'react';

import type {SignInPageRef} from './SignInPage';

import SignInPageWrapped, {SignInPage} from './SignInPage';

function SignInModal() {
    const theme = useTheme();
    const StyleUtils = useStyleUtils();
    const signinPageRef = useRef<SignInPageRef | null>(null);
    const session = useSession();
    const [isLoadingApp] = useOnyx(ONYXKEYS.IS_LOADING_APP);
    const hasSignedInRef = useRef(false);
    // Use of SignInPageWrapped (with shouldEnableMaxHeight prop in SignInPageWrapper) is a workaround for Safari not supporting interactive-widget=resizes-content.
    // This allows better scrolling experience after keyboard shows for modals with input, that are larger than remaining screen height.
    // More info https://github.com/Expensify/App/pull/62799#issuecomment-2943136220.
    const SignInPageBase = useMemo(() => (isMobileSafari() ? SignInPageWrapped : SignInPage), []);

    // Perform the same back navigation as the on-screen header back button: delegate to SignInPage
    // once its ref is attached, otherwise dismiss the modal directly.
    const handleBackButtonPress = useCallback(() => {
        if (!signinPageRef.current) {
            Navigation.goBack();
            return;
        }
        signinPageRef.current.navigateBack();
    }, []);

    // The SignInPage (child component of SignInModal) also uses useAndroidBackButtonHandler, so its hardwareBackPress listener remains active in the SignInModal.
    // Because BackHandler evaluates listeners in reverse registration order and SignInModal's listener is registered last, it is evaluated first and stops the dispatch.
    // It must therefore perform the back navigation itself and return true, so the hardware back button mirrors the header back button (https://github.com/Expensify/App/issues/69391, https://github.com/Expensify/App/issues/67883).
    const handleHardwareBackPress = useCallback(() => {
        handleBackButtonPress();
        return true;
    }, [handleBackButtonPress]);
    useAndroidBackButtonHandler(handleHardwareBackPress);

    useEffect(() => {
        const isAnonymousUser = session?.authTokenType === CONST.AUTH_TOKEN_TYPES.ANONYMOUS;
        if (!isAnonymousUser) {
            hasSignedInRef.current = true;

            // To prevent deadlock when OpenReport and OpenApp overlap, wait for the queue to be idle before calling openApp.
            // This ensures that any communication gaps between the client and server during OpenReport processing do not cause the queue to pause,
            // which would prevent us from processing or clearing the queue.
            waitForIdle().then(() => openApp(true));
        }
    }, [session?.authTokenType]);

    // Wait for IS_LOADING_APP to become false after sign-in before dismissing the modal.
    // openApp queues a request and IS_LOADING_APP only transitions to false once the response
    // is processed and NVP_ONBOARDING is loaded. Dismissing at that point ensures OnboardingGuard
    // evaluates with accurate data and properly redirects new users to onboarding.
    useEffect(() => {
        if (!hasSignedInRef.current || isLoadingApp !== false) {
            return;
        }

        const shouldPreserveRevealedReport = isReportTopmostSplitNavigator();
        Navigation.dismissModal();
        if (shouldPreserveRevealedReport) {
            return;
        }
        Navigation.navigate(ROUTES.HOME);
    }, [isLoadingApp]);

    return (
        <ScreenWrapper
            style={[StyleUtils.getBackgroundColorStyle(theme.PAGE_THEMES[SCREENS.RIGHT_MODAL.SIGN_IN].backgroundColor)]}
            includeSafeAreaPaddingBottom={false}
            shouldShowOfflineIndicator={false}
            testID="SignInModal"
        >
            <HeaderWithBackButton onBackButtonPress={handleBackButtonPress} />
            <SignInPageBase ref={signinPageRef} />
        </ScreenWrapper>
    );
}

export default SignInModal;

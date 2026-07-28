import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import {useInitialURLState} from '@components/InitialURLContextProvider';

import useOnyx from '@hooks/useOnyx';

import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {getLastShortAuthToken} from '@libs/Network/NetworkStore';
import {isLoggingInAsDelegate as isLoggingInAsDelegateSessionUtils, isLoggingInAsNewUser as isLoggingInAsNewUserSessionUtils} from '@libs/SessionUtils';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';

import Navigation from '@navigation/Navigation';
import type {AuthScreensParamList} from '@navigation/types';

import {signInWithShortLivedAuthToken, signInWithSupportAuthToken, signOutAndRedirectToSignIn} from '@userActions/Session';

import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React, {useEffect, useRef} from 'react';

type LogOutPreviousUserPageProps = PlatformStackScreenProps<AuthScreensParamList, typeof SCREENS.TRANSITION_BETWEEN_APPS>;

// This page is responsible for handling transitions from OldDot. Specifically, it logs the current user
// out if the transition is for another user.
//
// This component should not do any other navigation as that handled in App.setUpPoliciesAndNavigate
function LogOutPreviousUserPage({route}: LogOutPreviousUserPageProps) {
    const {initialURL} = useInitialURLState();
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const [isAuthenticatingWithShortLivedToken] = useOnyx(ONYXKEYS.RAM_ONLY_IS_AUTHENTICATING_WITH_SHORT_LIVED_TOKEN);
    const isAccountLoading = account?.isLoading;
    const {authTokenType, shortLivedAuthToken = '', exitTo} = route?.params ?? {};

    // Set synchronously in the effect below, at the moment we kick off the re-authentication. The Onyx flags cannot be
    // used for that: `account.isLoading` is only set once `Device.getDeviceInfoWithID()` resolves, and even the RAM-only
    // in-flight key is propagated to this subscriber asynchronously, so both still read falsy while the token swap is
    // starting. This ref is what lets the exitTo effect below know a re-authentication is pending on its first run.
    const isReauthenticatingRef = useRef(false);

    // Guards the exitTo navigation so it happens exactly once. Running it a second time (when the loading flags settle)
    // closes and re-pushes the freshly opened RHP mid-enter-transition, which leaves the card stuck semi-transparent.
    const hasNavigatedToExitToRef = useRef(false);

    useEffect(() => {
        const sessionEmail = session?.email;
        const transitionURL = CONFIG.IS_HYBRID_APP ? `${CONST.DEEPLINK_BASE_URL}${initialURL ?? ''}` : initialURL;
        const isLoggingInAsNewUser = isLoggingInAsNewUserSessionUtils(transitionURL ?? undefined, sessionEmail);
        const isSupportalLogin = authTokenType === CONST.AUTH_TOKEN_TYPES.SUPPORT;

        if (isLoggingInAsNewUser) {
            // We don't want to close react-native app in this particular case.
            signOutAndRedirectToSignIn(false, isSupportalLogin);
            return;
        }

        if (isSupportalLogin) {
            // The public transition page may already have started this exact sign-in before the Public/Auth
            // navigator swap re-mounted us here. Firing it again trips the support-token rate limit, so skip
            // the duplicate but still finish navigating home.
            if (shortLivedAuthToken !== getLastShortAuthToken()) {
                signInWithSupportAuthToken(shortLivedAuthToken);
            }
            Navigation.isNavigationReady().then(() => {
                // We must call goBack() to remove the /transition route from history
                Navigation.goBack();
                Navigation.navigate(ROUTES.HOME);
            });
            return;
        }
        const isLoggingInAsDelegate = isLoggingInAsDelegateSessionUtils(transitionURL ?? undefined);

        if (isLoggingInAsDelegate) {
            return;
        }

        // Even if the user was already authenticated in NewDot, we need to reauthenticate them with shortLivedAuthToken,
        // because the old authToken stored in Onyx may be invalid.
        isReauthenticatingRef.current = true;
        signInWithShortLivedAuthToken(shortLivedAuthToken);

        // We only want to run this effect once on mount (when the page first loads after transitioning from OldDot)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialURL]);

    useEffect(() => {
        const sessionEmail = session?.email;
        const transitionURL = CONFIG.IS_HYBRID_APP ? `${CONST.DEEPLINK_BASE_URL}${initialURL ?? ''}` : initialURL;
        const isLoggingInAsNewUser = isLoggingInAsNewUserSessionUtils(transitionURL ?? undefined, sessionEmail);

        // Hold the navigation until the shortLivedAuthToken re-authentication started above has reported it finished.
        // Navigating while the token swap is still in flight mounts the exitTo screen with a session that is about to be
        // replaced, so the request it fires on mount (e.g. OpenReport) dies in the swap window and its loading state is
        // never cleared, leaving the screen stuck on a skeleton. The RAM-only key is set to `false` by the same
        // `finallyData` that clears `account.isLoading`, so it is only treated as settled once it is explicitly `false`.
        const isReauthenticationPending = isReauthenticatingRef.current && isAuthenticatingWithShortLivedToken !== false;

        // We don't want to navigate to the exitTo route when creating a new workspace from a deep link,
        // because we already handle creating the optimistic policy and navigating to it in App.setUpPoliciesAndNavigate,
        // which is already called when AuthScreens mounts.
        // For HybridApp we have separate logic to handle transitions.
        if (!CONFIG.IS_HYBRID_APP && exitTo !== ROUTES.WORKSPACE_NEW && !isAccountLoading && !isLoggingInAsNewUser && !isReauthenticationPending && !hasNavigatedToExitToRef.current) {
            hasNavigatedToExitToRef.current = true;
            Navigation.isNavigationReady().then(() => {
                // remove this screen and navigate to exit route
                Navigation.goBack(ROUTES.HOME);
                if (exitTo) {
                    Navigation.navigate(exitTo as Route);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialURL, isAccountLoading, isAuthenticatingWithShortLivedToken]);

    const reasonAttributes: SkeletonSpanReasonAttributes = {
        context: 'LogOutPreviousUserPage',
    };
    return <FullScreenLoadingIndicator reasonAttributes={reasonAttributes} />;
}

export default LogOutPreviousUserPage;

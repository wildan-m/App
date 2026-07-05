import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useOnyx from '@hooks/useOnyx';

import {connect} from '@libs/actions/Delegate';
import getCurrentUrl from '@libs/Navigation/currentUrl';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';
import {getSearchParamFromUrl} from '@libs/Url';

import * as App from '@userActions/App';

import ONYXKEYS from '@src/ONYXKEYS';

import React, {Suspense, use} from 'react';

let connectPromise: Promise<boolean | undefined> | null = null;

type DelegatorConnectGateProps = {
    delegatorEmail: string;
    children: React.ReactNode;
};

/**
 * Gate component — only mounted when delegatorEmail exists.
 * Owns Onyx subscriptions needed for Delegate.connect() and suspends
 * via use() until the connect promise resolves.
 */
function DelegatorConnectGate({children, delegatorEmail}: DelegatorConnectGateProps) {
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const [credentials] = useOnyx(ONYXKEYS.CREDENTIALS);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);

    // Module-level cache survives unmount/remount cycles caused by Onyx.clear() inside connect().
    // connect() always returns a Promise when isFromOldDot is true.
    connectPromise ??=
        connect({
            email: delegatorEmail,
            delegatedAccess: account?.delegatedAccess,
            credentials,
            session,
            activePolicyID,
            isFromOldDot: true,
        })?.then((success) => {
            // Once connect() settles, the delegate's openApp() has already run, so the app is no longer loading.
            // Clear IS_LOADING_APP so loading-gated UI (LHN skeleton, Home "Begin" section) is unblocked.
            // Passing `!!success` left IS_LOADING_APP stuck true after a successful copilot switch, and since only
            // openApp() (never reconnectApp()) resets it, the Home page kept showing a skeleton for the copilot.
            App.setAppLoading(false);
            return success;
        }) ?? Promise.resolve(undefined);

    use(connectPromise);

    return children;
}

/**
 * Cheap composable guard. Parses URL for delegatorEmail.
 * If absent, renders children directly (no hooks, no Onyx, no Suspense).
 * If present, wraps children in Suspense + DelegatorConnectGate.
 */
function DelegatorConnectGuard({children}: {children: React.ReactNode}) {
    const delegatorEmail = getSearchParamFromUrl(getCurrentUrl(), 'delegatorEmail');

    if (!delegatorEmail) {
        return children;
    }

    return (
        <Suspense fallback={<FullScreenLoadingIndicator reasonAttributes={{context: 'DelegatorConnectGate'} satisfies SkeletonSpanReasonAttributes} />}>
            <DelegatorConnectGate delegatorEmail={delegatorEmail}>{children}</DelegatorConnectGate>
        </Suspense>
    );
}

export default DelegatorConnectGuard;

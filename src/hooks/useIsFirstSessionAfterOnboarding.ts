import ONYXKEYS from '@src/ONYXKEYS';

import type {ResultMetadata} from 'react-native-onyx';

import {hasCompletedGuidedSetupFlowSelector} from '@selectors/Onboarding';
import {useEffect} from 'react';

import useOnyx from './useOnyx';

// Sticky for the lifetime of the session: once guided setup has been observed as incomplete, the user signed up in this
// session, so promotional UI stays suppressed even after they finish onboarding and the NVP flips to true.
let hasObservedActiveOnboardingThisSession = false;

type FirstSessionAfterOnboarding = {
    /** Whether the user is in the first authenticated session of a brand-new account. */
    isFirstSessionAfterOnboarding: boolean;

    /** Metadata of the onboarding NVP, so consumers can stay hidden until the value is known. */
    onboardingMetadata: ResultMetadata;
};

/**
 * Whether the user is in the first authenticated session of a brand-new account, which is when promotional UI such as
 * the product marketing window should stay hidden.
 *
 * `hasCompletedGuidedSetupFlowSelector` returns `true` for old and OldDot-migrated accounts and `undefined` only while
 * the NVP is still loading, so the comparison is strict: neither case marks the session as a first session.
 */
function useIsFirstSessionAfterOnboarding(): FirstSessionAfterOnboarding {
    const [hasCompletedGuidedSetupFlow, onboardingMetadata] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: hasCompletedGuidedSetupFlowSelector});

    useEffect(() => {
        if (hasCompletedGuidedSetupFlow !== false) {
            return;
        }
        hasObservedActiveOnboardingThisSession = true;
    }, [hasCompletedGuidedSetupFlow]);

    return {
        isFirstSessionAfterOnboarding: hasCompletedGuidedSetupFlow === false || hasObservedActiveOnboardingThisSession,
        onboardingMetadata,
    };
}

export default useIsFirstSessionAfterOnboarding;

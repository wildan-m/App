import {useCallback, useEffect, useState} from 'react';
import HapticFeedback from '@libs/HapticFeedback';
import ONYXKEYS from '@src/ONYXKEYS';
import useOnyx from './useOnyx';

function usePaymentAnimations() {
    const [isPaidAnimationRunning, setIsPaidAnimationRunning] = useState(false);
    const [isApprovedAnimationRunning, setIsApprovedAnimationRunning] = useState(false);
    const [isSubmittingAnimationRunning, setIsSubmittingAnimationRunning] = useState(false);
    const [supportalPermissionDenied] = useOnyx(ONYXKEYS.SUPPORTAL_PERMISSION_DENIED);

    const stopAnimation = useCallback(() => {
        setIsPaidAnimationRunning(false);
        setIsApprovedAnimationRunning(false);
        setIsSubmittingAnimationRunning(false);
    }, []);

    // A support-logged-in user's payment/approval/submit is rejected server-side with a non-retryable
    // 411 (see SupportalPermission middleware). That path suppresses the retry and surfaces the
    // permission-denied modal, but it never resolves the optimistic animation that startAnimation()
    // kicked off before the API call, leaving the settlement button stuck in its in-progress state.
    // Stop the animation as soon as the denial is flagged so the actionable button is restored.
    useEffect(() => {
        if (!supportalPermissionDenied) {
            return;
        }
        stopAnimation();
    }, [supportalPermissionDenied, stopAnimation]);

    const startAnimation = useCallback(() => {
        setIsPaidAnimationRunning(true);
        HapticFeedback.longPress();
    }, []);

    const startApprovedAnimation = useCallback(() => {
        setIsApprovedAnimationRunning(true);
        HapticFeedback.longPress();
    }, []);

    const startSubmittingAnimation = useCallback(() => {
        setIsSubmittingAnimationRunning(true);
        HapticFeedback.longPress();
    }, []);

    return {
        isPaidAnimationRunning,
        isApprovedAnimationRunning,
        isSubmittingAnimationRunning,
        stopAnimation,
        startAnimation,
        startApprovedAnimation,
        startSubmittingAnimation,
    };
}

export default usePaymentAnimations;

import usePrevious from '@hooks/usePrevious';

import Navigation from '@libs/Navigation/Navigation';

import type * as OnyxTypes from '@src/types/onyx';

import {useEffect, useRef} from 'react';

import shouldFollowActionBadgeTarget from './shouldFollowActionBadgeTarget';

type UseFollowActionBadgeTargetParams = {
    /** Whether the app is running in production, where this auto-scroll behavior is gated off */
    isProduction: boolean;

    /** The ID of the report whose list is being displayed */
    reportID: string;

    /** The report action the badge currently targets (the oldest preview still requiring action) */
    actionTargetReportActionID: string | undefined;

    /** Index of the current target in the rendered (inverted) list, or -1 when it is not rendered */
    actionBadgeTargetIndex: number;

    /** The rendered (inverted) report actions the list is displaying */
    renderedVisibleReportActions: OnyxTypes.ReportAction[];

    /** Scrolls the list to the current action-badge target */
    scrollToActionBadgeTarget: () => void;
};

/**
 * Once the current action-badge target is resolved (e.g. the user approves/pays an older report preview), the badge target
 * advances to the next report preview that requires action. This hook follows it by scrolling down to the new target on the next
 * frame, so the scroll begins immediately as the button is pressed rather than after its success animation finishes.
 */
function useFollowActionBadgeTarget({
    isProduction,
    reportID,
    actionTargetReportActionID,
    actionBadgeTargetIndex,
    renderedVisibleReportActions,
    scrollToActionBadgeTarget,
}: UseFollowActionBadgeTargetParams) {
    const prevActionTargetReportActionID = usePrevious(actionTargetReportActionID);
    // Keep the latest scroll callback in a ref so a scroll scheduled for the next frame still targets the current badge index.
    // The effect below only re-runs when the target id changes, so without this the delayed callback would close over a stale
    // target index if the list shifts (new message, pagination, resolved preview collapsing) during the wait.
    const scrollToActionBadgeTargetRef = useRef(scrollToActionBadgeTarget);
    useEffect(() => {
        scrollToActionBadgeTargetRef.current = scrollToActionBadgeTarget;
    });
    useEffect(() => {
        const prevActionBadgeTargetIndex = renderedVisibleReportActions.findIndex((action) => action.reportActionID === prevActionTargetReportActionID);
        if (!shouldFollowActionBadgeTarget({isProduction, actionTargetReportActionID, prevActionTargetReportActionID, actionBadgeTargetIndex, prevActionBadgeTargetIndex})) {
            return;
        }
        // Only follow the badge when the resolving action happened on this report's preview while this report is the one on
        // screen. If the target advanced because the action was done on another page (e.g. submitting inside the expense report
        // itself, or resolving it from an RHP), this report isn't the topmost/active report, so auto-scrolling it would shift the
        // list out from under the user and is confusing.
        if (Navigation.getTopmostReportId() !== reportID || !!Navigation.getReportRHPActiveRoute()) {
            return;
        }
        // Scroll on the next frame so the forward-scroll begins immediately as the button is pressed, in parallel with its success
        // animation, instead of waiting for the animation to finish. Because the list is inverted and the badge always targets the
        // oldest actionable preview, the target advances to a lower (newer) index, so we scroll downward and the resolved preview
        // collapses above the viewport where its animation is no longer disruptive; scrollToActionBadgeTargetRef keeps the target
        // index current if the list shifts during the frame.
        const animationFrameID = requestAnimationFrame(() => scrollToActionBadgeTargetRef.current());
        return () => cancelAnimationFrame(animationFrameID);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actionTargetReportActionID]);
}

export default useFollowActionBadgeTarget;

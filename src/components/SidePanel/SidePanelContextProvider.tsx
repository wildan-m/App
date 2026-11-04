import useOnyx from '@hooks/useOnyx';
import useResizableSidePanelWidth from '@hooks/useResizableSidePanelWidth';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useSidePanelDisplayStatus from '@hooks/useSidePanelDisplayStatus';
import useWindowDimensions from '@hooks/useWindowDimensions';

import SidePanelActions from '@libs/actions/SidePanel';
import focusComposerWithDelay from '@libs/focusComposerWithDelay';
import {getServerAnchoredDBTime} from '@libs/NetworkState';
import {canEditWorkspaceSettings, shouldShowPolicy} from '@libs/PolicyUtils';
import ReportActionComposeFocusManager from '@libs/ReportActionComposeFocusManager';

import variables from '@styles/variables';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {emailSelector} from '@src/selectors/Session';
import type {SidePanel} from '@src/types/onyx';

import type {PropsWithChildren, RefObject} from 'react';

import React, {createContext, useEffect, useRef, useState} from 'react';
// Import Animated directly from 'react-native' as animations are used with navigation.
// eslint-disable-next-line no-restricted-imports
import {Animated} from 'react-native';

type SidePanelStateContextProps = {
    isSidePanelTransitionEnded: boolean;
    isSidePanelHiddenOrLargeScreen: boolean;
    shouldHideSidePanel: boolean;
    shouldHideSidePanelBackdrop: boolean;
    shouldHideHelpButton: boolean;
    shouldHideToolTip: boolean;
    sidePanelOffset: RefObject<Animated.Value>;
    sidePanelTranslateX: RefObject<Animated.Value>;
    sidePanelNVP?: SidePanel;
    sessionStartTime: string | null;

    /** The panel's width on a wide layout: the dragged width clamped to the window, or the default. */
    sidePanelWidth: number;

    /** How narrow and how wide the panel can be dragged. */
    sidePanelMinWidth: number;
    sidePanelMaxWidth: number;

    /** Whether the panel shows a resize handle and an Expand button. */
    isSidePanelResizable: boolean;
};

type SidePanelActionsContextProps = {
    openSidePanel: (options?: {forceConcierge?: boolean; reportID?: string}) => void;
    closeSidePanel: (options?: {afterTransition?: () => void}) => void;

    /** Set from below the WideRHPContextProvider, which mounts under this provider, so the panel can stay narrow enough to keep a wide RHP on screen. */
    setIsWideRHPOpen: (isWideRHPOpen: boolean) => void;
};

const SidePanelStateContext = createContext<SidePanelStateContextProps>({
    isSidePanelTransitionEnded: true,
    isSidePanelHiddenOrLargeScreen: true,
    shouldHideSidePanel: true,
    shouldHideSidePanelBackdrop: true,
    shouldHideHelpButton: true,
    shouldHideToolTip: false,
    sidePanelOffset: {current: new Animated.Value(0)},
    sidePanelTranslateX: {current: new Animated.Value(0)},
    sessionStartTime: null,
    sidePanelWidth: variables.sidePanelWidth,
    sidePanelMinWidth: variables.sidePanelWidth,
    sidePanelMaxWidth: variables.sidePanelWidth,
    isSidePanelResizable: false,
});

const SidePanelReportIDContext = createContext<string | undefined>(undefined);

const SidePanelActionsContext = createContext<SidePanelActionsContextProps>({
    openSidePanel: () => {},
    closeSidePanel: () => {},
    setIsWideRHPOpen: () => {},
});

/**
 * Hook to get the animated position of the Side Panel and the margin of the navigator
 */
function SidePanelContextProvider({children}: PropsWithChildren) {
    const {isExtraLargeScreenWidth, shouldUseNarrowLayout} = useResponsiveLayout();
    const {windowWidth} = useWindowDimensions();
    const [isWideRHPOpen, setIsWideRHPOpen] = useState(false);
    const {width: resizableSidePanelWidth, min: sidePanelMinWidth, max: sidePanelMaxWidth, isResizable: isSidePanelResizable} = useResizableSidePanelWidth(isWideRHPOpen);
    const sidePanelWidth = shouldUseNarrowLayout ? windowWidth : resizableSidePanelWidth;

    const [isSidePanelTransitionEnded, setIsSidePanelTransitionEnded] = useState(true);
    const {shouldHideSidePanel, shouldHideSidePanelBackdrop, shouldHideHelpButton, isSidePanelHiddenOrLargeScreen, sidePanelNVP} = useSidePanelDisplayStatus();
    const shouldHideToolTip = isExtraLargeScreenWidth ? !isSidePanelTransitionEnded : !shouldHideSidePanel;

    const shouldApplySidePanelOffset = isExtraLargeScreenWidth && !shouldHideSidePanel;
    const sidePanelOffset = useRef(new Animated.Value(shouldApplySidePanelOffset ? resizableSidePanelWidth : 0));
    const sidePanelTranslateX = useRef(new Animated.Value(shouldHideSidePanel ? sidePanelWidth : 0));
    const sidePanelWidthRef = useRef(sidePanelWidth);
    const dockedSidePanelWidthRef = useRef(resizableSidePanelWidth);

    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [onboardingRHPVariant] = useOnyx(ONYXKEYS.NVP_ONBOARDING_RHP_VARIANT);
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [activePolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`);
    const [sessionEmail] = useOnyx(ONYXKEYS.SESSION, {
        selector: emailSelector,
    });

    const isRHPAdminsRoom = onboardingRHPVariant === CONST.ONBOARDING_RHP_VARIANT.RHP_ADMINS_ROOM;
    const isRHPHomePage = onboardingRHPVariant === CONST.ONBOARDING_RHP_VARIANT.RHP_HOME_PAGE;
    const isUserAdmin = canEditWorkspaceSettings(activePolicy);
    const isPolicyActive = shouldShowPolicy(activePolicy, false, sessionEmail ?? '');
    const adminsChatReportID = activePolicy?.chatReportIDAdmins?.toString();

    const defaultReportID =
        !sidePanelNVP?.forceConcierge && (isRHPAdminsRoom || isRHPHomePage) && isUserAdmin && isPolicyActive && adminsChatReportID ? adminsChatReportID : conciergeReportID;
    const reportID = sidePanelNVP?.reportID ?? defaultReportID;

    const onCloseCompleteRef = useRef<(() => void) | undefined>(undefined);
    const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
    const [prevShouldHideSidePanel, setPrevShouldHideSidePanel] = useState(shouldHideSidePanel);

    if (prevShouldHideSidePanel !== shouldHideSidePanel) {
        setPrevShouldHideSidePanel(shouldHideSidePanel);
        if (!shouldHideSidePanel && !sessionStartTime) {
            setSessionStartTime(getServerAnchoredDBTime());
        }
    }

    useEffect(() => {
        sidePanelWidthRef.current = sidePanelWidth;
    }, [sidePanelWidth]);

    // A docked panel that changes width (a drag, a window resize, a wide RHP opening) moves the page beside it along. Mid-transition, the animation picks up the new width.
    useEffect(() => {
        dockedSidePanelWidthRef.current = resizableSidePanelWidth;
        if (!shouldApplySidePanelOffset || !isSidePanelTransitionEnded) {
            return;
        }
        sidePanelOffset.current.setValue(resizableSidePanelWidth);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only a width change should move the offset; open/close is animated below
    }, [resizableSidePanelWidth]);

    // sidePanelWidth dependency in useEffect below caused the help panel content to slide in on window resize
    useEffect(() => {
        // We need to set transition state to false when animation starts, then back to true when it completes.
        // This is intentional state management for coordinating with the animation lifecycle.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsSidePanelTransitionEnded(false);
        Animated.parallel([
            Animated.timing(sidePanelOffset.current, {
                toValue: shouldApplySidePanelOffset ? dockedSidePanelWidthRef.current : 0,
                duration: CONST.SIDE_PANEL_ANIMATED_TRANSITION,
                useNativeDriver: true,
            }),
            Animated.timing(sidePanelTranslateX.current, {
                toValue: shouldHideSidePanel ? sidePanelWidthRef.current : 0,
                duration: CONST.SIDE_PANEL_ANIMATED_TRANSITION,
                useNativeDriver: true,
            }),
        ]).start(({finished}) => {
            setIsSidePanelTransitionEnded(true);
            // Clear the session after the slide-out, not when it starts: the panel stays mounted for the animation and
            // a null session empties its message list. `finished` is false on an interrupted close, sparing the new session.
            if (finished && shouldHideSidePanel) {
                setSessionStartTime(null);
            }
            onCloseCompleteRef.current?.();
            onCloseCompleteRef.current = undefined;
        });
    }, [shouldHideSidePanel, shouldApplySidePanelOffset]);

    const closeSidePanel = (options?: {afterTransition?: () => void}) => {
        // User shouldn't be able to close side panel if side panel NVP is undefined
        if (!sidePanelNVP) {
            return;
        }

        onCloseCompleteRef.current = options?.afterTransition;
        setIsSidePanelTransitionEnded(false);
        SidePanelActions.dismissSidePanel();

        // Focus the composer after closing the Side Panel
        focusComposerWithDelay(ReportActionComposeFocusManager.composerRef.current, CONST.SIDE_PANEL_ANIMATED_TRANSITION + CONST.COMPOSER_FOCUS_DELAY)(true);
    };

    const openSidePanel = (options?: {forceConcierge?: boolean; reportID?: string}) => {
        setSessionStartTime(getServerAnchoredDBTime());
        SidePanelActions.openSidePanel(!isExtraLargeScreenWidth, options?.forceConcierge, options?.reportID);
    };

    // Because of the React Compiler we don't need to memoize it manually
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const stateValue = {
        isSidePanelTransitionEnded,
        isSidePanelHiddenOrLargeScreen,
        shouldHideSidePanel,
        shouldHideSidePanelBackdrop,
        shouldHideHelpButton,
        shouldHideToolTip,
        sidePanelOffset,
        sidePanelTranslateX,
        sidePanelNVP,
        sessionStartTime,
        sidePanelWidth: resizableSidePanelWidth,
        sidePanelMinWidth,
        sidePanelMaxWidth,
        isSidePanelResizable,
    };

    // Because of the React Compiler we don't need to memoize it manually
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const actionsValue = {
        openSidePanel,
        closeSidePanel,
        setIsWideRHPOpen,
    };

    return (
        <SidePanelStateContext.Provider value={stateValue}>
            <SidePanelReportIDContext.Provider value={reportID}>
                <SidePanelActionsContext.Provider value={actionsValue}>{children}</SidePanelActionsContext.Provider>
            </SidePanelReportIDContext.Provider>
        </SidePanelStateContext.Provider>
    );
}

export default SidePanelContextProvider;
export {SidePanelStateContext, SidePanelReportIDContext, SidePanelActionsContext};

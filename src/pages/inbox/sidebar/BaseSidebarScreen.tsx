import NAVIGATION_TABS from '@components/Navigation/NavigationTabBar/NAVIGATION_TABS';
import TabBarBottomContent from '@components/Navigation/TabBarBottomContent';
import TopBarWithLoadingBar from '@components/Navigation/TopBarWithLoadingBar';
import OptionsListSkeletonView from '@components/OptionsListSkeletonView';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import {isMobile} from '@libs/Browser';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import InboxTabSelector from './InboxTabSelector';
import SidebarLinksData from './SidebarLinksData';

// Once the app finishes loading for the first time, we never show the skeleton again
// (even if isLoadingApp briefly flips back to true during a reconnect).
// This uses a module-level variable + connectWithoutView instead of a ref because
// a ref resets on unmount, so the skeleton would flash again when the component
// remounts (e.g. navigating between tabs).
let hasEverFinishedLoading = false;
Onyx.connectWithoutView({
    key: ONYXKEYS.IS_LOADING_APP,
    callback: (value) => {
        if (value !== false) {
            return;
        }
        hasEverFinishedLoading = true;
    },
});

function BaseSidebarScreen() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [isLoadingApp = true] = useOnyx(ONYXKEYS.IS_LOADING_APP);
    // `hasEverFinishedLoading` resets to false on a full JS reload (e.g. a staging/production deploy refresh),
    // and `isLoadingApp` flips to true optimistically while OpenApp runs, so this full-screen skeleton would
    // otherwise hide the sidebar even when reports are already hydrated from the persistent Onyx cache. When
    // any report data is cached, skip the full-screen skeleton and mount SidebarLinksData, whose own overlay
    // skeleton is correctly gated on the ordered report set (`isLoadingReportData && !hasReportData`); if the
    // cache turns out to hold no renderable rows, that inner gate still shows the skeleton, so there is no
    // regression for the genuinely-empty first-run case.
    const [hasCachedReports = false] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: (reports) => Object.keys(reports ?? {}).length > 0});
    const shouldShowSkeleton = isLoadingApp && !hasEverFinishedLoading && !hasCachedReports;

    return (
        <ScreenWrapper
            shouldEnableKeyboardAvoidingView={false}
            style={[styles.sidebar, isMobile() ? styles.userSelectNone : {}]}
            testID="BaseSidebarScreen"
            bottomContent={<TabBarBottomContent selectedTab={NAVIGATION_TABS.INBOX} />}
            bottomContentStyle={styles.overflowVisible}
        >
            {({insets}) => (
                <>
                    <TopBarWithLoadingBar
                        breadcrumbLabel={translate('common.inbox')}
                        shouldDisplaySearch={shouldUseNarrowLayout}
                        shouldDisplayHelpButton={shouldUseNarrowLayout}
                    />
                    {!shouldShowSkeleton && <InboxTabSelector />}
                    <View style={[styles.flex1]}>
                        {shouldShowSkeleton ? (
                            <OptionsListSkeletonView
                                shouldAnimate
                                reasonAttributes={{context: 'BaseSidebarScreen', isLoadingApp, hasEverFinishedLoading} satisfies SkeletonSpanReasonAttributes}
                            />
                        ) : (
                            <SidebarLinksData insets={insets} />
                        )}
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
}

export default BaseSidebarScreen;

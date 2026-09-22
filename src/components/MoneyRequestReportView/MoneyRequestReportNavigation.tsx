import PrevNextButtons from '@components/PrevNextButtons';
import {useSearchResultsContext} from '@components/Search/SearchContext';
import Text from '@components/Text';

import useFilterPendingDeleteReports from '@hooks/useFilterPendingDeleteReports';
import useOnyx from '@hooks/useOnyx';
import useSearchSections from '@hooks/useSearchSections';
import useThemeStyles from '@hooks/useThemeStyles';

import {startSpan} from '@libs/telemetry/activeSpans';

import Navigation from '@navigation/Navigation';

import {saveLastSearchParams} from '@userActions/ReportNavigation';
import {search} from '@userActions/Search';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchResults} from '@src/types/onyx';
import type LastSearchParams from '@src/types/onyx/ReportNavigation';

import type {OnyxEntry} from 'react-native-onyx';

import React, {startTransition, useEffect, useState} from 'react';
import {View} from 'react-native';

type MoneyRequestReportNavigationProps = {
    reportID?: string;
    shouldDisplayNarrowVersion: boolean;
};

type MoneyRequestReportNavigationContentProps = MoneyRequestReportNavigationProps & {
    contextReports: Array<string | undefined>;
};

type MoneyRequestReportNavigationStandaloneProps = {
    onReportsChange: (updater: (previousReports: Array<string | undefined>) => Array<string | undefined>) => void;
};

type SnapshotGuard = {
    hasMultiple: boolean;
    includesReport: boolean;
};

const EMPTY_GUARD: SnapshotGuard = {
    hasMultiple: false,
    includesReport: false,
};

const selectIsExpenseReportSearch = (lastSearchQuery: OnyxEntry<LastSearchParams>): boolean => lastSearchQuery?.queryJSON?.type === CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT;

const selectQueryHash = (lastSearchQuery: OnyxEntry<LastSearchParams>): number | undefined => lastSearchQuery?.queryJSON?.hash;

const searchLoadingSelector = (snapshot: OnyxEntry<SearchResults>): boolean => !!snapshot?.search?.isLoading;

const searchOffsetSelector = (snapshot: OnyxEntry<SearchResults>): number => snapshot?.search?.offset ?? 0;

const isSameReportList = (a: Array<string | undefined>, b: Array<string | undefined> | null): boolean => {
    if (a === b) {
        return true;
    }
    if (b === null || a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a.at(i) !== b.at(i)) {
            return false;
        }
    }
    return true;
};

const buildSnapshotGuardSelector =
    (reportID: string | undefined) =>
    (snapshot: OnyxEntry<SearchResults>): SnapshotGuard => {
        const data = snapshot?.data;
        if (!data || !reportID) {
            return EMPTY_GUARD;
        }
        const prefix = ONYXKEYS.COLLECTION.REPORT;
        let count = 0;
        let includesReport = false;
        for (const key of Object.keys(data)) {
            if (!key.startsWith(prefix)) {
                continue;
            }
            count++;
            if (!includesReport && key.slice(prefix.length) === reportID) {
                includesReport = true;
            }
            if (count > 1 && includesReport) {
                break;
            }
        }
        return {hasMultiple: count > 1, includesReport};
    };

// Mounts the heavy useSearchSections subscriptions (card feeds, report NVPs, bank accounts, report
// attributes) and the getSections/getSortedSections rebuild, then lifts the computed list up. It is
// rendered by the content component only on the slow path (pagination in flight, no context list, or the
// user close enough to the end of the context list that pagination is about to start), so those
// subscriptions never run while the fast context path is active — restoring the lightweight fast path
// from #86238. Keeping the lifted value in the always-mounted content component means it (and the
// lastValidReports cache) survive the isSearchLoading toggle instead of being wiped by a subtree swap.
function MoneyRequestReportNavigationStandalone({onReportsChange}: MoneyRequestReportNavigationStandaloneProps) {
    const {allReports} = useSearchSections();

    useEffect(() => {
        // Guard by content, not reference: useSearchSections rebuilds allReports via filter/map each
        // render, so an identity check would refire this update every render and loop.
        onReportsChange((previousReports) => (isSameReportList(allReports, previousReports) ? previousReports : allReports));
    }, [allReports, onReportsChange]);

    return null;
}

function MoneyRequestReportNavigationContent({reportID, shouldDisplayNarrowVersion, contextReports}: MoneyRequestReportNavigationContentProps) {
    const styles = useThemeStyles();

    // Lightweight subscriptions only: the current search query and its loading flag. These never mount
    // the heavy useSearchSections subscription set, so the fast context path stays cheap.
    const [lastSearchQuery] = useOnyx(ONYXKEYS.REPORT_NAVIGATION_LAST_SEARCH_QUERY);
    const [isSearchLoading = false] = useOnyx(`${ONYXKEYS.COLLECTION.SNAPSHOT}${lastSearchQuery?.queryJSON?.hash}`, {selector: searchLoadingSelector});
    const [searchOffset = 0] = useOnyx(`${ONYXKEYS.COLLECTION.SNAPSHOT}${lastSearchQuery?.queryJSON?.hash}`, {selector: searchOffsetSelector});

    // Fast path: use the pre-computed IDs from the search context when they are usable and no page is in
    // flight. Otherwise fall back to the standalone list, which is produced by the child below that mounts
    // the heavy subscriptions only on the slow paths. Because this is a value swap inside a single, stable
    // component, toggling isSearchLoading (e.g. the search refresh triggered by submitting a report) no
    // longer unmounts the component and wipes the lastValidReports cache below.
    const [standaloneReports, setStandaloneReports] = useState<Array<string | undefined>>([]);

    // The context list is written only from the search list screen, which is covered and suspended while a
    // report is open, so it stays pinned to the reports of the page that was loaded when the report was
    // opened. Pages fetched by the carousel itself land in the search snapshot but never in that list, so
    // the context list must stop winning once the standalone list has actually grown past it — otherwise
    // the carousel is stuck at one page and the next arrow is disabled at its last report.
    const shouldUseContextReports = contextReports.length > 0 && !isSearchLoading && standaloneReports.length <= contextReports.length;
    const allReports = shouldUseContextReports ? contextReports : standaloneReports;

    // Derived from the context list rather than the list actually in use, so that mounting the standalone
    // source cannot change the condition that decides whether to mount it.
    const contextIndex = contextReports.indexOf(reportID);
    const contextThreshold = Math.min(contextReports.length * 0.75, contextReports.length - 2);
    const hasReachedContextPrefetchThreshold = contextIndex !== -1 && contextIndex + 1 >= contextThreshold;

    // Mount the standalone source on the existing slow path, and also once the user is close enough to the
    // end of the context list that pagination is about to start, so the pages it fetches have somewhere to
    // appear. Reports that are fully loaded never reach this, so the cheap fast path is kept for them.
    const shouldMountStandaloneSource = !shouldUseContextReports || (hasReachedContextPrefetchThreshold && !!lastSearchQuery?.hasMoreResults);

    const liveCurrentIndex = allReports.indexOf(reportID);

    // Cache the last list where the current report was still present. When the search snapshot
    // is refreshed and the current report drops out (e.g. after approving from Spend > Needs
    // Approval), keep using the cached list so the carousel stays populated and the user can
    // navigate to the next report instead of the arrows disappearing. setState during render is
    // the React-recommended pattern for storing information from previous renders. We compare
    // by content rather than reference because useSearchSections rebuilds allReports via
    // filter/map each render, so identity comparison would refire the setState every render and
    // trigger an infinite update loop.
    const [lastValidReports, setLastValidReports] = useState<Array<string | undefined> | null>(null);
    if (liveCurrentIndex !== -1 && !isSameReportList(allReports, lastValidReports)) {
        setLastValidReports(allReports);
    }
    const effectiveAllReports = liveCurrentIndex === -1 && lastValidReports ? lastValidReports : allReports;
    const currentIndex = effectiveAllReports.indexOf(reportID);

    const allReportsCount = lastSearchQuery?.previousLengthOfResults ?? 0;
    const hideNextButton = !lastSearchQuery?.hasMoreResults && currentIndex === effectiveAllReports.length - 1;
    const hidePrevButton = currentIndex === 0;
    const shouldDisplayNavigationArrows = effectiveAllReports.length > 1 && currentIndex !== -1 && !!lastSearchQuery?.queryJSON;

    useEffect(() => {
        if (!lastSearchQuery?.queryJSON) {
            return;
        }

        if (lastSearchQuery.allowPostSearchRecount) {
            saveLastSearchParams({
                ...lastSearchQuery,
                allowPostSearchRecount: false,
                previousLengthOfResults: effectiveAllReports.length,
            });
            return;
        }

        // Update count when reports are added or removed (e.g., created offline)
        if (effectiveAllReports.length !== allReportsCount) {
            saveLastSearchParams({
                ...lastSearchQuery,
                previousLengthOfResults: effectiveAllReports.length,
            });
            return;
        }

        if (currentIndex < allReportsCount - 1) {
            return;
        }

        saveLastSearchParams({
            ...lastSearchQuery,
            previousLengthOfResults: effectiveAllReports.length,
        });
    }, [currentIndex, allReportsCount, effectiveAllReports.length, lastSearchQuery?.queryJSON, lastSearchQuery]);

    const goToReportId = (reportId?: string) => {
        if (!reportId) {
            return;
        }
        startSpan(`${CONST.TELEMETRY.SPAN_OPEN_REPORT}_${reportId}`, {
            name: 'ReportNavigation',
            op: CONST.TELEMETRY.SPAN_OPEN_REPORT,
        });
        startTransition(() => {
            Navigation.setParams({
                reportID: reportId,
                reportActionID: undefined,
                referrer: undefined,
            });
        });
    };

    const goToNextReport = () => {
        if (currentIndex === -1 || effectiveAllReports.length === 0 || !lastSearchQuery?.queryJSON) {
            return;
        }
        const threshold = Math.min(effectiveAllReports.length * 0.75, effectiveAllReports.length - 2);

        // Derive the next page from the snapshot's own cursor instead of the previously persisted offset.
        // The persisted offset advances with every response, so pressing next repeatedly near the end of a
        // page would keep adding a page size to it and walk it past the end of the result set, persisting a
        // false hasMoreResults. Skip the request entirely while the page covering that cursor is still in
        // flight, so a single press can never advance pagination by more than one page.
        const nextOffset = searchOffset + CONST.SEARCH.RESULTS_PAGE_SIZE;
        const isNextPageAlreadyRequested = searchOffset > effectiveAllReports.length - CONST.SEARCH.RESULTS_PAGE_SIZE;

        if (currentIndex + 1 >= threshold && lastSearchQuery?.hasMoreResults && !isSearchLoading && !isNextPageAlreadyRequested) {
            const queryJSON = lastSearchQuery.queryJSON;
            requestAnimationFrame(() => {
                search({
                    queryJSON,
                    offset: nextOffset,
                    prevReportsLength: effectiveAllReports.length,
                    shouldCalculateTotals: false,
                    searchKey: lastSearchQuery.searchKey,
                    isLoading: false,
                    shouldUpdateLastSearchParams: true,
                });
            });
        }

        const nextIndex = (currentIndex + 1) % effectiveAllReports.length;
        goToReportId(effectiveAllReports.at(nextIndex));
    };

    const goToPrevReport = () => {
        if (currentIndex === -1 || effectiveAllReports.length === 0) {
            return;
        }

        const prevIndex = (currentIndex - 1) % effectiveAllReports.length;
        goToReportId(effectiveAllReports.at(prevIndex));
    };

    return (
        <>
            {/* Slow path and end-of-page only: mount the heavy subscriptions and lift the computed list up.
                Rendered even when the arrows are hidden, since standaloneReports is what decides whether to
                show them. */}
            {shouldMountStandaloneSource && <MoneyRequestReportNavigationStandalone onReportsChange={setStandaloneReports} />}
            {shouldDisplayNavigationArrows && (
                <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap2]}>
                    {!shouldDisplayNarrowVersion && <Text style={styles.mutedTextLabel}>{`${currentIndex + 1} of ${allReportsCount}`}</Text>}
                    <PrevNextButtons
                        isPrevButtonDisabled={hidePrevButton}
                        isNextButtonDisabled={hideNextButton}
                        onNext={goToNextReport}
                        onPrevious={goToPrevReport}
                    />
                </View>
            )}
        </>
    );
}

function MoneyRequestReportNavigation({reportID, shouldDisplayNarrowVersion}: MoneyRequestReportNavigationProps) {
    // Guard: only mount inner tree when snapshot confirms multiple expense reports
    const [isExpenseReportSearch] = useOnyx(ONYXKEYS.REPORT_NAVIGATION_LAST_SEARCH_QUERY, {selector: selectIsExpenseReportSearch});
    const [hash] = useOnyx(ONYXKEYS.REPORT_NAVIGATION_LAST_SEARCH_QUERY, {
        selector: selectQueryHash,
    });
    const snapshotGuardSelector = buildSnapshotGuardSelector(reportID);
    const [snapshotGuard = EMPTY_GUARD] = useOnyx(`${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`, {selector: snapshotGuardSelector});

    // Fast-path source: pre-computed IDs from the search context. The heavier useSearchSections
    // subscription is deferred to the standalone child rendered by the content component, which mounts
    // it only on the slow path (pagination/loading or no context list).
    const {sortedReportIDs} = useSearchResultsContext();
    const contextReports = useFilterPendingDeleteReports(sortedReportIDs);

    const isLiveGuardSatisfied = isExpenseReportSearch && snapshotGuard.hasMultiple && snapshotGuard.includesReport;

    // Once the live snapshot has satisfied the guard during this mount, keep the inner component
    // mounted even if the guard later flips false (e.g. the current report is removed from the
    // snapshot after approving it). The inner component falls back to a cached list so the
    // carousel stays visible for continued navigation.
    const [shouldKeepMounted, setShouldKeepMounted] = useState(false);
    if (isLiveGuardSatisfied && !shouldKeepMounted) {
        setShouldKeepMounted(true);
    }

    if (!shouldKeepMounted) {
        return null;
    }

    // A single, stable content instance owns the fast-path vs. standalone source selection and the
    // lastValidReports cache. Because it is never unmounted while the carousel is visible, the search
    // refresh that submitting a report triggers can no longer destroy that cache, so the navigation
    // arrows stay visible after the current report drops out of the live list.
    return (
        <MoneyRequestReportNavigationContent
            reportID={reportID}
            shouldDisplayNarrowVersion={shouldDisplayNarrowVersion}
            contextReports={contextReports}
        />
    );
}

export default MoneyRequestReportNavigation;

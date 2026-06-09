import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import type {OnyxCollection} from 'react-native-onyx';
import BaseWidgetItem from '@components/BaseWidgetItem';
import WidgetContainer from '@components/WidgetContainer';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import {buildQueryStringFromFilterFormValues} from '@libs/SearchQueryUtils';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';
import isWithinGettingStartedPeriod from '@pages/home/GettingStartedSection/utils/isWithinGettingStartedPeriod';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {accountIDSelector} from '@src/selectors/Session';
import todosReportCountsSelector, {EMPTY_TODOS_SINGLE_REPORT_IDS, todosSingleReportIDsSelector} from '@src/selectors/Todos';
import type {Report} from '@src/types/onyx';
import EmptyState from './EmptyState';
import ForYouSkeleton from './ForYouSkeleton';

function ForYouSection() {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [accountID] = useOnyx(ONYXKEYS.SESSION, {selector: accountIDSelector});
    const [firstDayFreeTrial] = useOnyx(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL);
    const hasEverHadExpenseReportSelector = useCallback(
        (reports: OnyxCollection<Report>) =>
            Object.values(reports ?? {}).some((report) => report?.type === CONST.REPORT.TYPE.EXPENSE && (report.ownerAccountID === accountID || report.managerID === accountID)),
        [accountID],
    );
    const [hasEverHadExpenseReport = false] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: hasEverHadExpenseReportSelector});
    const [isLoadingApp = true] = useOnyx(ONYXKEYS.IS_LOADING_APP);
    const [isLoadingReportData = false] = useOnyx(ONYXKEYS.IS_LOADING_REPORT_DATA);
    // HAS_LOADED_APP flips to true once the first OpenApp completes and persists across reconnects.
    // Gating the skeleton on it prevents the section from flashing skeleton on every foreground/reconnect
    // when IS_LOADING_REPORT_DATA is optimistically set to true by ReconnectApp.
    const [hasLoadedApp = false] = useOnyx(ONYXKEYS.HAS_LOADED_APP);
    const [reportCounts = CONST.EMPTY_TODOS_REPORT_COUNTS] = useOnyx(ONYXKEYS.DERIVED.TODOS, {selector: todosReportCountsSelector});
    const [singleReportIDs = EMPTY_TODOS_SINGLE_REPORT_IDS] = useOnyx(ONYXKEYS.DERIVED.TODOS, {selector: todosSingleReportIDsSelector});

    const icons = useMemoizedLazyExpensifyIcons(['MoneyBag', 'Send', 'ThumbsUp', 'Export']);

    const submitCount = reportCounts?.[CONST.SEARCH.SEARCH_KEYS.SUBMIT] ?? 0;
    const approveCount = reportCounts?.[CONST.SEARCH.SEARCH_KEYS.APPROVE] ?? 0;
    const payCount = reportCounts?.[CONST.SEARCH.SEARCH_KEYS.PAY] ?? 0;
    const exportCount = reportCounts?.[CONST.SEARCH.SEARCH_KEYS.EXPORT] ?? 0;

    const hasAnyTodos = submitCount > 0 || approveCount > 0 || payCount > 0 || exportCount > 0;

    const createNavigationHandler = useCallback(
        (action: string, queryParams: Record<string, unknown>, reportID?: string) => () => {
            if (reportID) {
                if (shouldUseNarrowLayout) {
                    Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(reportID, undefined, undefined, ROUTES.HOME));
                } else {
                    Navigation.navigate(ROUTES.EXPENSE_REPORT_RHP.getRoute({reportID, backTo: ROUTES.HOME}));
                }
                return;
            }

            Navigation.navigate(
                ROUTES.SEARCH_ROOT.getRoute({
                    query: buildQueryStringFromFilterFormValues({
                        type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT,
                        action,
                        ...queryParams,
                    }),
                }),
            );
        },
        [shouldUseNarrowLayout],
    );

    const todoItems = useMemo(
        () =>
            [
                {
                    key: 'submit',
                    count: submitCount,
                    icon: icons.Send,
                    translationKey: 'homePage.forYouSection.submit' as const,
                    handler: createNavigationHandler(CONST.SEARCH.ACTION_FILTERS.SUBMIT, {from: [`${accountID}`]}, singleReportIDs[CONST.SEARCH.SEARCH_KEYS.SUBMIT]),
                },
                {
                    key: 'approve',
                    count: approveCount,
                    icon: icons.ThumbsUp,
                    translationKey: 'homePage.forYouSection.approve' as const,
                    handler: createNavigationHandler(CONST.SEARCH.ACTION_FILTERS.APPROVE, {to: [`${accountID}`]}, singleReportIDs[CONST.SEARCH.SEARCH_KEYS.APPROVE]),
                },
                {
                    key: 'pay',
                    count: payCount,
                    icon: icons.MoneyBag,
                    translationKey: 'homePage.forYouSection.pay' as const,
                    handler: createNavigationHandler(
                        CONST.SEARCH.ACTION_FILTERS.PAY,
                        {reimbursable: CONST.SEARCH.BOOLEAN.YES, payer: accountID?.toString()},
                        singleReportIDs[CONST.SEARCH.SEARCH_KEYS.PAY],
                    ),
                },
                {
                    key: 'export',
                    count: exportCount,
                    icon: icons.Export,
                    translationKey: 'homePage.forYouSection.export' as const,
                    handler: createNavigationHandler(
                        CONST.SEARCH.ACTION_FILTERS.EXPORT,
                        {exporter: [`${accountID}`], exportedOn: CONST.SEARCH.DATE_PRESETS.NEVER},
                        singleReportIDs[CONST.SEARCH.SEARCH_KEYS.EXPORT],
                    ),
                },
            ].filter((item) => item.count > 0),
        [accountID, approveCount, createNavigationHandler, exportCount, icons.Export, icons.MoneyBag, icons.Send, icons.ThumbsUp, payCount, singleReportIDs, submitCount],
    );

    const renderTodoItems = () => (
        <View style={styles.getForYouSectionContainerStyle(shouldUseNarrowLayout)}>
            {todoItems.map(({key, count, icon, translationKey, handler}) => (
                <BaseWidgetItem
                    key={key}
                    icon={icon}
                    iconBackgroundColor={theme.widgetIconBG}
                    iconFill={theme.widgetIconFill}
                    title={translate(translationKey, {count})}
                    ctaText={translate('homePage.forYouSection.begin')}
                    onCtaPress={handler}
                    buttonProps={{success: true}}
                />
            ))}
        </View>
    );

    const isInitialLoad = !hasLoadedApp && (isLoadingApp || isLoadingReportData || reportCounts === undefined);

    // Hide the empty "For You" slot for recently onboarded users (within the 60-day window) who have never had a report
    // populate it, so an actionless widget doesn't occupy a prominent Home position during onboarding. Once a report has
    // been created/approved/paid (or the onboarding window has passed), the empty state is kept as before.
    const shouldHideEmptySlot = !isInitialLoad && !hasAnyTodos && isWithinGettingStartedPeriod(firstDayFreeTrial) && !hasEverHadExpenseReport;

    const renderContent = () => {
        if (isInitialLoad) {
            const reasonAttributes: SkeletonSpanReasonAttributes = {
                context: 'ForYouSection.ForYouSkeleton',
                isLoadingApp,
                isLoadingReportData,
                hasLoadedApp,
                isReportCountsUndefined: reportCounts === undefined,
            };
            return <ForYouSkeleton reasonAttributes={reasonAttributes} />;
        }

        return hasAnyTodos ? renderTodoItems() : <EmptyState />;
    };

    if (shouldHideEmptySlot) {
        return null;
    }

    return <WidgetContainer title={translate('homePage.forYou')}>{renderContent()}</WidgetContainer>;
}

export default ForYouSection;

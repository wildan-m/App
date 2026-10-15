import CHART_GROUP_BY_CONFIG from '@components/Search/chartGroupByConfig';
import type {TransactionWorkflowStageGroupListItemType} from '@components/Search/SearchList/ListItem/types';
import type {SearchSortBy, SortOrder} from '@components/Search/types';

import isInsightsOnlyGroupBy from '@libs/isInsightsOnlyGroupBy';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';
import {getSections, getSortedSections, getValidGroupBy, isTransactionWorkflowStageGroupListItemType} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import createMock from '../../utils/createMock';
import {convertToDisplayString, formatPhoneNumber, localeCompare, translateLocal} from '../../utils/TestHelper';

const {CREATED_SUBMITTED, SUBMITTED_APPROVED, APPROVED_PAID} = CONST.SEARCH.WORKFLOW_STAGES;

const workflowStageData: OnyxTypes.SearchResults['data'] = {
    personalDetailsList: {},
    [`${CONST.SEARCH.GROUP_PREFIX}${CREATED_SUBMITTED}` as const]: {
        workflowStage: CREATED_SUBMITTED,
        averageDuration: 86400,
        count: 4,
        currency: 'USD',
        total: 400,
    },
    [`${CONST.SEARCH.GROUP_PREFIX}${SUBMITTED_APPROVED}` as const]: {
        workflowStage: SUBMITTED_APPROVED,
        averageDuration: 259200,
        count: 3,
        currency: 'USD',
        total: 300,
    },
    [`${CONST.SEARCH.GROUP_PREFIX}${APPROVED_PAID}` as const]: {
        workflowStage: APPROVED_PAID,
        averageDuration: 3600,
        count: 2,
        currency: 'USD',
        total: 200,
    },
};

function getWorkflowStageSections(data: OnyxTypes.SearchResults['data']) {
    return getSections({
        dateFnsLocale: undefined,
        type: CONST.SEARCH.DATA_TYPES.EXPENSE,
        data,
        currentAccountID: 1,
        currentUserEmail: '',
        translate: translateLocal,
        formatPhoneNumber,
        bankAccountList: {},
        rules: undefined,
        groupBy: CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE,
        conciergeReportID: undefined,
        convertToDisplayString,
        reportAttributesDerivedValue: {},
    })[0].filter(isTransactionWorkflowStageGroupListItemType);
}

function sortWorkflowStages(items: TransactionWorkflowStageGroupListItemType[], sortOrder?: SortOrder, sortBy: SearchSortBy = CONST.SEARCH.TABLE_COLUMNS.DATE) {
    const sortedItems = getSortedSections(CONST.SEARCH.DATA_TYPES.EXPENSE, [...items], localeCompare, translateLocal, sortBy, sortOrder, CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE);
    return sortedItems.filter(isTransactionWorkflowStageGroupListItemType).map((item) => item.workflowStage);
}

describe('Workflow stage group-by', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await IntlStore.load('en');
    });

    describe('getSections', () => {
        it('builds a row per workflow stage with its translated label and average duration', () => {
            // Given grouped results with one entry per workflow stage
            // When the sections are built for group-by:workflow-stage
            const sections = getWorkflowStageSections(workflowStageData);

            // Then each stage becomes a row carrying the label charts read and the duration they plot
            expect(sections).toHaveLength(3);
            expect(sections.every(isTransactionWorkflowStageGroupListItemType)).toBe(true);
            expect(sections.map(({workflowStage, formattedWorkflowStage, averageDuration}) => ({workflowStage, formattedWorkflowStage, averageDuration}))).toEqual([
                {workflowStage: CREATED_SUBMITTED, formattedWorkflowStage: 'Created to submitted', averageDuration: 86400},
                {workflowStage: SUBMITTED_APPROVED, formattedWorkflowStage: 'Submitted to approved', averageDuration: 259200},
                {workflowStage: APPROVED_PAID, formattedWorkflowStage: 'Approved to paid', averageDuration: 3600},
            ]);
        });

        it('does not build a drill-in query for workflow stage rows', () => {
            // Given workflow stage rows, which are durations rather than a filter on transactions
            // When the sections are built
            const sections = getWorkflowStageSections(workflowStageData);

            // Then no row carries a transactions query to drill into

            for (const section of sections) {
                expect(section.transactionsQueryJSON).toBeUndefined();
                expect(section.transactions).toEqual([]);
                expect(section.groupedBy).toBe(CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE);
            }
        });

        it('skips groups without an average duration', () => {
            // Given results that also hold a stage the backend sent without a duration
            // When the sections are built
            const sections = getWorkflowStageSections({
                ...workflowStageData,
                ...createMock<OnyxTypes.SearchResults['data']>({
                    [`${CONST.SEARCH.GROUP_PREFIX}noDuration` as const]: {workflowStage: APPROVED_PAID, count: 1, currency: 'USD', total: 1},
                }),
            });

            // Then only the stages with a duration are kept, since the other one can't be plotted
            expect(sections.map((section) => section.keyForList)).toEqual([
                `${CONST.SEARCH.GROUP_PREFIX}${CREATED_SUBMITTED}`,
                `${CONST.SEARCH.GROUP_PREFIX}${SUBMITTED_APPROVED}`,
                `${CONST.SEARCH.GROUP_PREFIX}${APPROVED_PAID}`,
            ]);
        });
    });

    describe('sorting', () => {
        it('orders stages by average duration in the requested order', () => {
            // Given stages whose average durations are out of workflow order
            const sections = getWorkflowStageSections(workflowStageData);

            // When they are sorted without a group column, Then the average duration decides the order in both directions

            expect(sortWorkflowStages(sections, CONST.SEARCH.SORT_ORDER.ASC)).toEqual([APPROVED_PAID, CREATED_SUBMITTED, SUBMITTED_APPROVED]);
            expect(sortWorkflowStages(sections, CONST.SEARCH.SORT_ORDER.DESC)).toEqual([SUBMITTED_APPROVED, CREATED_SUBMITTED, APPROVED_PAID]);
        });

        it('keeps workflow order for stages with the same average duration', () => {
            // Given stages that all took the same average time, listed backwards
            const sections = getWorkflowStageSections(workflowStageData).map((section) => ({...section, averageDuration: 60}));

            // When they are sorted, Then ties fall back to workflow order so the chart is stable
            expect(sortWorkflowStages(sections.reverse(), CONST.SEARCH.SORT_ORDER.DESC)).toEqual([CREATED_SUBMITTED, SUBMITTED_APPROVED, APPROVED_PAID]);
        });

        it('still sorts by a group total column when one is picked', () => {
            // Given stages with different totals
            const sections = getWorkflowStageSections(workflowStageData);

            // When the total column is picked as the sort, Then it wins over the default duration order

            expect(sortWorkflowStages(sections, CONST.SEARCH.SORT_ORDER.ASC, CONST.SEARCH.TABLE_COLUMNS.GROUP_TOTAL)).toEqual([APPROVED_PAID, SUBMITTED_APPROVED, CREATED_SUBMITTED]);
        });
    });

    describe('charts', () => {
        it('labels workflow stages without offering a drill-in query', () => {
            // Given a workflow stage row and the chart config for its group-by
            const [section] = getWorkflowStageSections(workflowStageData);
            const config = CHART_GROUP_BY_CONFIG[CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE];

            // When a chart reads it, Then the label comes from the stage and no drill-in query is offered, so points aren't pressable
            expect(config.getLabel(section)).toBe('Created to submitted');
            expect(config.getFilterQuery).toBeUndefined();
        });
    });

    describe('Spend normalization', () => {
        it('flags only workflow stage as Insights-only', () => {
            // Given every group-by, When each is checked, Then only workflow stage is kept out of Spend
            expect(isInsightsOnlyGroupBy(CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE)).toBe(true);
            for (const groupBy of Object.values(CONST.SEARCH.GROUP_BY).filter((value) => value !== CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE)) {
                expect(isInsightsOnlyGroupBy(groupBy)).toBe(false);
            }
        });

        it('treats a typed group-by:workflow-stage as no group-by on Spend', () => {
            // Given a Spend query where the user typed the Insights-only group-by by hand
            const queryJSON = buildSearchQueryJSON('type:expense group-by:workflow-stage');

            // When Spend resolves the group-by it can render, Then it falls back to ungrouped, while Insights still parses the value
            expect(queryJSON?.groupBy).toBe(CONST.SEARCH.GROUP_BY.WORKFLOW_STAGE);
            expect(getValidGroupBy(queryJSON?.groupBy)).toBeUndefined();
        });

        it('keeps every other group-by valid', () => {
            // Given regular and unknown group-bys, When Spend resolves them, Then only the unknown one is dropped
            expect(getValidGroupBy(CONST.SEARCH.GROUP_BY.CATEGORY)).toBe(CONST.SEARCH.GROUP_BY.CATEGORY);
            expect(getValidGroupBy(CONST.SEARCH.GROUP_BY.QUARTER)).toBe(CONST.SEARCH.GROUP_BY.QUARTER);
            expect(getValidGroupBy('not-a-group-by')).toBeUndefined();
        });
    });
});

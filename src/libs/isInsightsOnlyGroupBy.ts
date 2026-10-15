import CONST from '@src/CONST';

import type {TupleToUnion} from 'type-fest';

type InsightsOnlyGroupBy = TupleToUnion<typeof CONST.SEARCH.INSIGHTS_ONLY_GROUP_BYS>;

/** Whether the group-by only applies to Insights charts, so Spend must neither suggest it nor group by it */
function isInsightsOnlyGroupBy(groupBy: string | undefined): groupBy is InsightsOnlyGroupBy {
    return CONST.SEARCH.INSIGHTS_ONLY_GROUP_BYS.some((insightsOnlyGroupBy) => insightsOnlyGroupBy === groupBy);
}

export default isInsightsOnlyGroupBy;

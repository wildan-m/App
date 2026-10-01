import type {InsightsSearchKey} from './InsightsDashboard';

type SidePanel = {
    /** Whether the Side Panel is open on large screens */
    open: boolean;

    /** Whether the Side Panel is open on small screens */
    openNarrowScreen: boolean;

    /** Whether the Side Panel should always show the Concierge report, ignoring the admins room override */
    forceConcierge: boolean;

    /** The report the Side Panel shows instead of the Concierge chat it defaults to */
    reportID?: string;
};

/** The Insights dashboard and filters the user was looking at, matching what the dashboard was requested with */
type InsightsScope = {
    /** Dashboard the user was looking at */
    searchKey: InsightsSearchKey;

    /** Dashboard-wide query built from the selected filters */
    inputQuery: string;

    /** How many periods before the selected date range the comparisons span, when comparisons are shown */
    numberOfPeriods?: number;
};

/**
 * Describes the context of what the user was viewing when they sent a message from the Side Panel.
 * Sent to the backend so Concierge can tailor its response to the user's current context.
 */
type SidePanelContext = {reportID?: string; selectedTransactionIDs?: string; selectedReportIDs?: string; insightsScope?: InsightsScope};

export default SidePanel;
export type {InsightsScope, SidePanelContext};

import type {OnyxEntry} from 'react-native-onyx';
import CONST from '@src/CONST';
import type {ReportNameValuePairs} from '@src/types/onyx';

/**
 * Reads the AgentZero processing-indicator label for a single agent, trimmed.
 *
 * Tolerates a legacy scalar value (a plain string written by an older backend during a deploy
 * overlap) by attributing it to the room's scalar owner — Concierge in Concierge/admin rooms, or
 * the custom agent participant in a custom-agent room. This matches the pre-per-agent behavior for
 * Concierge while keeping custom-agent rooms correctly labeled with their own agent.
 */
function getAgentZeroProcessingLabel(reportNameValuePairs: OnyxEntry<ReportNameValuePairs>, agentAccountID: number, scalarOwnerAccountID: number = CONST.ACCOUNT_ID.CONCIERGE): string {
    const indicator = reportNameValuePairs?.agentZeroProcessingRequestIndicator;
    if (!indicator) {
        return '';
    }
    if (typeof indicator === 'string') {
        return agentAccountID === scalarOwnerAccountID ? indicator.trim() : '';
    }
    return indicator[String(agentAccountID)]?.trim() ?? '';
}

/**
 * Sorted list of agent accountIDs that currently have a non-empty processing label — the set of
 * agents the server is actively processing for in this report. Drives which thinking bubbles render.
 *
 * A legacy scalar value is attributed to `scalarOwnerAccountID` (the room's agent: Concierge in
 * Concierge/admin rooms, the custom agent in a custom-agent room) instead of always Concierge.
 */
function agentZeroProcessingAgentIDsSelector(reportNameValuePairs: OnyxEntry<ReportNameValuePairs>, scalarOwnerAccountID: number = CONST.ACCOUNT_ID.CONCIERGE): number[] {
    const indicator = reportNameValuePairs?.agentZeroProcessingRequestIndicator;
    if (!indicator) {
        return [];
    }
    if (typeof indicator === 'string') {
        return indicator.trim() ? [scalarOwnerAccountID] : [];
    }
    return Object.keys(indicator)
        .filter((key) => !!indicator[key]?.trim())
        .map(Number)
        .filter((accountID) => !Number.isNaN(accountID))
        .sort((a, b) => a - b);
}

export {getAgentZeroProcessingLabel, agentZeroProcessingAgentIDsSelector};

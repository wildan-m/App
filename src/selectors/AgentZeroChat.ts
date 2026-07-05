import CONST from '@src/CONST';
import type {ConciergePendingFollowupList, PersonalDetailsList} from '@src/types/onyx';
import type Report from '@src/types/onyx/Report';

import type {OnyxEntry} from 'react-native-onyx';

/** An AgentZero persona participating in a report: a custom agent or Concierge. */
type AgentParticipant = {
    /** The agent's accountID. */
    accountID: number;

    /** The agent's login (email) — used to match an explicit `@mention` in a sent message. */
    login: string;

    /** Whether this participant is a custom agent (vs. Concierge). */
    isCustomAgent: boolean;
};

const getReportParticipantAccountIDs = (report: OnyxEntry<Report>): number[] => (report?.participants ? Object.keys(report.participants).map(Number) : []);

/**
 * Returns the first participant accountID flagged as a custom agent (`isCustomAgent` on its
 * personalDetails entry, stamped server-side in `Account::formatNewDotPersonalDetails`), or
 * `undefined` when no participant is an agent.
 *
 * Parameterized so the closure captures only the report's small `participantAccountIDs` array —
 * the selector iterates those (small N) against `personalDetailsList`, not the full list. Output
 * is a primitive `number | undefined`, so `deepEqual` short-circuits cheaply and re-renders fire
 * only when an agent participant's flag flips.
 */
const getCustomAgentParticipantAccountID =
    (participantAccountIDs: number[] | undefined) =>
    (personalDetails: OnyxEntry<PersonalDetailsList>): number | undefined => {
        if (!participantAccountIDs?.length || !personalDetails) {
            return undefined;
        }
        return participantAccountIDs.find((accountID) => !!personalDetails[accountID]?.isCustomAgent);
    };

/**
 * Returns every AgentZero persona among a report's participants — each custom agent
 * (`isCustomAgent`) plus Concierge when present — with the accountID, login, and kind of each.
 * Concierge is included even without an `isCustomAgent` flag because it can be an explicit
 * `@mention` target in a group chat just like a custom agent.
 *
 * Parameterized so the closure captures only the report's small `participantAccountIDs` array.
 * Output is a small array of primitives, so `deepEqual` re-renders only when the agent roster
 * (or an agent's login/flag) actually changes.
 */
const getAgentParticipants =
    (participantAccountIDs: number[] | undefined) =>
    (personalDetails: OnyxEntry<PersonalDetailsList>): AgentParticipant[] => {
        if (!participantAccountIDs?.length || !personalDetails) {
            return [];
        }
        const agents: AgentParticipant[] = [];
        for (const accountID of participantAccountIDs) {
            const detail = personalDetails[accountID];
            if (!detail) {
                continue;
            }
            const isCustomAgent = !!detail.isCustomAgent;
            const isConcierge = accountID === CONST.ACCOUNT_ID.CONCIERGE;
            if (!isCustomAgent && !isConcierge) {
                continue;
            }
            agents.push({accountID, login: detail.login ?? (isConcierge ? CONST.EMAIL.CONCIERGE : ''), isCustomAgent});
        }
        return agents;
    };

const hasPendingFollowupListSkeletonSelector =
    (reportActionID: string) =>
    (pending: OnyxEntry<ConciergePendingFollowupList>): boolean =>
        !pending?.hidden && pending?.reportActionID === reportActionID;

export {getReportParticipantAccountIDs, getCustomAgentParticipantAccountID, getAgentParticipants, hasPendingFollowupListSkeletonSelector};
export type {AgentParticipant};

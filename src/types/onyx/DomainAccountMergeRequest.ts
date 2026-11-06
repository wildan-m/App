import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

import type * as OnyxCommon from './OnyxCommon';

/** A decision an admin can make on a domain account merge request */
type DomainAccountMergeRequestDecision = ValueOf<typeof CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION>;

/** A request to merge a domain-controlled account, waiting for a domain admin's decision */
type DomainAccountMergeRequest = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Unique ID of the request */
    requestID: string;

    /** Account ID of the member who submitted the request */
    requesterAccountID: number;

    /** Login of the domain-controlled account being merged into the requester's account */
    sourceLogin: string;

    /** Login of the account that remains after the merge */
    targetLogin?: string;

    /** The domain that controls the account being merged. The request is reviewed on this domain's Members page */
    domainAccountID?: number;

    /** The other domain of a cross-domain request */
    targetDomainAccountID?: number;

    /** When the request was generated, in UTC. The request expires 24 hours after this time */
    created: string;

    /** Client-only: the decision the current user has sent and is waiting on the server for */
    pendingDecision?: DomainAccountMergeRequestDecision | null;

    /** Client-only: the decision the server has accepted, kept until the page has confirmed it to the user */
    resolvedDecision?: DomainAccountMergeRequestDecision | null;

    /** Errors from the latest failed action on the request */
    errors?: OnyxCommon.Errors | null;
}>;

export type {DomainAccountMergeRequestDecision};
export default DomainAccountMergeRequest;

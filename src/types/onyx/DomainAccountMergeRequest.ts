import type * as OnyxCommon from './OnyxCommon';

/** A request to merge a domain-controlled account, waiting for a domain admin's decision */
type DomainAccountMergeRequest = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Unique ID of the request */
    requestID: string;

    /** Account ID of the member who submitted the request */
    requesterAccountID: number;

    /** Login of the domain-controlled account being merged into the requester's account */
    sourceLogin: string;

    /** When the request was generated, in UTC. The request expires 24 hours after this time */
    created: string;

    /** Errors from the latest failed action on the request */
    errors?: OnyxCommon.Errors | null;
}>;

export default DomainAccountMergeRequest;

import type * as OnyxCommon from './OnyxCommon';

/** Model of the current user's pending adminship request for a domain */
type DomainAdminshipRequest = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Whether the current user has a pending request to become an admin of the domain */
    requested: boolean;

    /** Errors that occurred while requesting adminship */
    errors?: OnyxCommon.Errors;
}>;

export default DomainAdminshipRequest;

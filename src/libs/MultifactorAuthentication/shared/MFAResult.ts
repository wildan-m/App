import type {MultifactorAuthenticationReason} from './types';
import VALUES from './VALUES';

type MFAError = {
    readonly reason: MultifactorAuthenticationReason;
    readonly httpStatusCode?: number;
    readonly message: string | undefined;
};

/**
 * Factory functions for creating MFAError instances.
 * `local` — errors originating on the client (no HTTP status code).
 * `fromApiResponse` — errors derived from an API response; defaults reason to UNHANDLED_API_RESPONSE when undefined.
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare -- Intentional: companion object shares name with MFAError type (type+value merge pattern)
const MFAError = {
    local(reason: MultifactorAuthenticationReason, message: string | undefined): MFAError {
        return {reason, message};
    },

    fromApiResponse(httpStatusCode: number | undefined, reason: MultifactorAuthenticationReason | undefined, message?: string): MFAError {
        const resolvedReason: MultifactorAuthenticationReason = reason ?? VALUES.REASON.LOCAL_ERRORS.UNHANDLED_API_RESPONSE;
        return {reason: resolvedReason, httpStatusCode, message};
    },
} as const;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- {} means "no additional data fields" as default generic parameter
type MFAResult<TData = {}> = ({success: true} & TData) | {success: false; error: MFAError};

export type {MFAResult};
export {MFAError};

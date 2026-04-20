import type {MultifactorAuthenticationScenarioConfig, MultifactorAuthenticationScenarioResponse} from '@components/MultifactorAuthentication/config/types';
import {isHttpSuccess} from '@libs/MultifactorAuthentication/shared/helpers';
import {MfaError} from '@libs/MultifactorAuthentication/shared/MfaResult';
import type {MfaResult} from '@libs/MultifactorAuthentication/shared/MfaResult';
import type {RegistrationKeyInfo} from '@libs/MultifactorAuthentication/shared/types';
import VALUES from '@libs/MultifactorAuthentication/VALUES';
import {registerAuthenticationKey} from './index';

type RegistrationParams = {
    keyInfo: RegistrationKeyInfo;
};

async function processRegistration(params: RegistrationParams): Promise<MfaResult> {
    const {httpStatusCode, reason, message} = await registerAuthenticationKey({
        keyInfo: params.keyInfo,
    });

    if (isHttpSuccess(httpStatusCode)) {
        return {success: true};
    }

    return {success: false, error: MfaError.fromApiResponse(httpStatusCode, reason, message)};
}

async function processScenarioAction(
    action: MultifactorAuthenticationScenarioConfig['action'],
    params: Parameters<MultifactorAuthenticationScenarioConfig['action']>[0],
): Promise<MfaResult<MultifactorAuthenticationScenarioResponse>> {
    if (!params.signedChallenge) {
        return {
            success: false,
            error: MfaError.local(VALUES.REASON.LOCAL_ERRORS.SIGNATURE_MISSING, 'Signed challenge is missing from scenario action params'),
        };
    }

    const {httpStatusCode, reason, message, body} = await action(params);

    if (isHttpSuccess(httpStatusCode)) {
        return {
            success: true,
            httpStatusCode,
            reason,
            message,
            body,
        };
    }

    return {success: false, error: MfaError.fromApiResponse(httpStatusCode, reason, message)};
}

export {processRegistration, processScenarioAction};
export type {RegistrationParams};

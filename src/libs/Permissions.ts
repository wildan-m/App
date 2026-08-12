import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type Beta from '@src/types/onyx/Beta';
import type BetaConfiguration from '@src/types/onyx/BetaConfiguration';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

// Local dev/staging-only per-beta overrides set from the Test Tool Menu's Beta Overrides tool.
// We use `connectWithoutView` because this is non-render logic and the override must apply to every
// beta check in the app — threading it as a parameter through every call site is not practical.
let betasOverride: OnyxEntry<Partial<Record<Beta, boolean>>>;
Onyx.connectWithoutView({
    key: ONYXKEYS.BETAS_OVERRIDE,
    callback: (value) => {
        betasOverride = value;
    },
});

// eslint-disable-next-line rulesdir/no-beta-handler
function canUseAllBetas(betas: OnyxEntry<Beta[]>): boolean {
    return !!betas?.includes(CONST.BETAS.ALL);
}

/**
 * Link previews are temporarily disabled.
 */
function canUseLinkPreviews(): boolean {
    return false;
}

function isBetaEnabled(beta: Beta, betas: OnyxEntry<Beta[]>, betaConfiguration?: OnyxEntry<BetaConfiguration>): boolean {
    // A local override set from the Test Tool Menu always wins over whatever the backend provided
    const override = betasOverride?.[beta];
    if (override !== undefined) {
        return override;
    }

    const hasAllBetasEnabled = canUseAllBetas(betas);
    const isFeatureEnabled = !!betas?.includes(beta);

    // Explicit only betas and exclusion betas are not enabled only by the 'all' beta. Explicit only betas must be set explicitly to enable the feature.
    // Exclusion betas are designed to disable features, so being on the 'all' beta should not disable these features as that contradicts its purpose.
    if (((betaConfiguration?.explicitOnly?.includes(beta) ?? false) || (betaConfiguration?.exclusion?.includes(beta) ?? false)) && hasAllBetasEnabled && !isFeatureEnabled) {
        return false;
    }

    return isFeatureEnabled || hasAllBetasEnabled;
}

/**
 * Track flows ("Share with my accountant", "Categorize it") are hardcoded off.
 * TODO: Remove this gate and its call sites once the new track flows feature is complete.
 * See: https://github.com/Expensify/Expensify/issues/504214
 */
function canUseTrackFlows(): boolean {
    return false;
}

/**
 * Private notes are temporarily disabled.
 */
function canUsePrivateNotes(): boolean {
    return false;
}

export default {
    canUseLinkPreviews,
    canUseTrackFlows,
    canUsePrivateNotes,
    isBetaEnabled,
};

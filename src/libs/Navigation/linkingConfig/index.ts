import getAdaptedStateFromPath from '@libs/Navigation/helpers/getAdaptedStateFromPath';
import getPathFromState from '@libs/Navigation/helpers/getPathFromState';
import type {RootNavigatorParamList} from '@libs/Navigation/types';

import type {LinkingOptions} from '@react-navigation/native';

import {config} from './config';
import isNativeOAuthCallbackURL from './isNativeOAuthCallbackURL';
import prefixes from './prefixes';
import subscribe from './subscribe';

const linkingConfig: LinkingOptions<RootNavigatorParamList> = {
    // Referenced lazily instead of by value: `linkingConfig` sits in an import cycle
    // (getAdaptedStateFromPath -> ReportUtils -> ... -> OnboardingFlow -> linkingConfig), so this module
    // body can run while `getAdaptedStateFromPath` is still initializing. Capturing it by value there
    // stores `undefined`, and React Navigation silently falls back to its built-in `getStateFromPath`,
    // which never adds the fullscreen route underneath an RHP (blank background after a refresh).
    getStateFromPath: (...args: Parameters<typeof getAdaptedStateFromPath>) => getAdaptedStateFromPath(...args),
    getPathFromState,
    prefixes,
    config,
    subscribe,
    // Native only: react-navigation reads `filter` in useLinking.native, not on web. There it covers both the
    // initial URL and later `url` events. The native OAuth callback is consumed by the auth session that opened
    // it, so routing it would only land on NotFound and tear down the returning screen. The signed-out path goes
    // through openReportFromDeepLink instead, which has its own guard.
    filter: (url) => !isNativeOAuthCallbackURL(url),
};

// eslint-disable-next-line import/prefer-default-export
export {linkingConfig};

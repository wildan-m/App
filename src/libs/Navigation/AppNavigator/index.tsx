import React, {lazy, memo, Suspense, useState, useEffect} from 'react';
import lazyRetry from '@src/utils/lazyRetry';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import SplashScreen from '@components/SplashScreen';

const AuthScreens = lazy(() => lazyRetry(() => import('./AuthScreens')));
const PublicScreens = lazy(() => lazyRetry(() => import('./PublicScreens')));

type AppNavigatorProps = {
    /** If we have an authToken this is true */
    authenticated: boolean;
};

function AppNavigator({authenticated}: AppNavigatorProps) {
    const [currentScreen, setCurrentScreen] = useState<JSX.Element | null>(null);

    useEffect(() => {
        if (authenticated) {
         // These are the protected screens and only accessible when an authToken is present
            setCurrentScreen(
                <Suspense fallback={<SplashScreen/>}>
                    <AuthScreens />
                </Suspense>
            );
        } else {
            setCurrentScreen(
                <Suspense fallback={null}>
                    <PublicScreens />
                </Suspense>
            );
        }
    }, [authenticated]);

    return currentScreen;
}

AppNavigator.displayName = 'AppNavigator';

export default memo(AppNavigator);

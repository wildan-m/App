import type {ParamListBase, ScreenLayoutArgs} from '@react-navigation/native';
import React, {useLayoutEffect, useRef} from 'react';
// eslint-disable-next-line no-restricted-imports
import TransitionTracker from '@libs/Navigation/TransitionTracker';
// eslint-disable-next-line no-restricted-imports
import type {TransitionHandle} from '@libs/Navigation/TransitionTracker';
import type {PlatformSpecificNavigationOptions, PlatformStackNavigationOptions, PlatformStackNavigationProp} from './types';

// screenLayout is invoked as a render function (not JSX), so we need this wrapper to create a proper React component boundary for hooks.
function screenLayoutWrapper({navigation, ...rest}: ScreenLayoutArgs<ParamListBase, string, PlatformSpecificNavigationOptions | PlatformStackNavigationOptions, string>) {
    return (
        <ScreenLayout
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...rest}
            // The type cast is needed because useNavigationBuilder hardcodes the Navigation generic to `string`.
            navigation={navigation as unknown as PlatformStackNavigationProp<ParamListBase>}
        />
    );
}

function ScreenLayout({
    children,
    navigation,
}: ScreenLayoutArgs<ParamListBase, string, PlatformSpecificNavigationOptions | PlatformStackNavigationOptions, PlatformStackNavigationProp<ParamListBase>>) {
    const transitionHandleRef = useRef<TransitionHandle | null>(null);

    useLayoutEffect(() => {
        const transitionStartListener = navigation.addListener('transitionStart', () => {
            // If a previous transitionStart never received its transitionEnd (can happen on iOS when
            // back-to-back transition events fire on the same screen during the public → protected
            // stack swap on fresh login), release the stale handle before opening a new one. Otherwise
            // it would leak until the 1000 ms safety timeout, leaving activeTransitions inflated and
            // pendingCallbacks stranded.
            if (transitionHandleRef.current) {
                TransitionTracker.endTransition(transitionHandleRef.current);
            }
            transitionHandleRef.current = TransitionTracker.startTransition();
        });
        const transitionEndListener = navigation.addListener('transitionEnd', () => {
            if (!transitionHandleRef.current) {
                return;
            }
            TransitionTracker.endTransition(transitionHandleRef.current);
            transitionHandleRef.current = null;
        });

        return () => {
            transitionStartListener();
            transitionEndListener();
            // If the screen unmounts mid-transition (e.g. sign-in being torn down during the
            // post-login navigation reset), release the in-flight handle here — the transitionEnd
            // listener has just been unsubscribed and would otherwise never run.
            if (transitionHandleRef.current) {
                TransitionTracker.endTransition(transitionHandleRef.current);
                transitionHandleRef.current = null;
            }
        };
    }, [navigation]);

    return children;
}

export default screenLayoutWrapper;

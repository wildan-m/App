import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {useFullScreenBlockingViewActions} from '@components/FullScreenBlockingViewContextProvider';
import useThemeStyles from '@hooks/useThemeStyles';
import type ForceFullScreenViewProps from './types';

function ForceFullScreenView({children, shouldForceFullScreen = false}: ForceFullScreenViewProps) {
    const route = useRoute();
    const isFocused = useIsFocused();
    const styles = useThemeStyles();
    const {addRouteKey, removeRouteKey} = useFullScreenBlockingViewActions();

    useEffect(() => {
        // Only register this blocking view while its screen is focused. If it stayed registered on blur,
        // the navigation tab bar would remain hidden during the back-navigation animation, so the leaving
        // screen's back button briefly replaces the left navigation bar on the screen we return to.
        if (!shouldForceFullScreen || !isFocused) {
            return;
        }

        addRouteKey(route.key);

        return () => removeRouteKey(route.key);
    }, [addRouteKey, removeRouteKey, route.key, shouldForceFullScreen, isFocused]);

    if (shouldForceFullScreen) {
        return <View style={styles.forcedBlockingViewContainer}>{children}</View>;
    }

    return children;
}

export default ForceFullScreenView;

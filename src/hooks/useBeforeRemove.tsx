import type {EventListenerCallback, EventMapCore, NavigationState} from '@react-navigation/native';

import {NavigationContext} from '@react-navigation/native';
import {useContext, useEffect} from 'react';

// beforeRemove have some limitations. When the react-navigation is upgraded to 7.x, update this to use usePreventRemove hook.
const useBeforeRemove = (onBeforeRemove: EventListenerCallback<EventMapCore<NavigationState>, 'beforeRemove'>) => {
    // Read NavigationContext directly instead of useNavigation so components rendered outside a navigator
    // (e.g. modals hosted by the global report action context menu) don't throw — there is no screen to be
    // removed there, so the listener is simply not attached.
    const navigation = useContext(NavigationContext);

    useEffect(() => {
        if (!navigation) {
            return;
        }
        const unsubscribe = navigation.addListener('beforeRemove', onBeforeRemove);
        return unsubscribe;
    }, [navigation, onBeforeRemove]);
};

export default useBeforeRemove;

import useOnyx from '@hooks/useOnyx';

import ONYXKEYS from '@src/ONYXKEYS';
import type ChildrenProps from '@src/types/utils/ChildrenProps';

import {useNavigationState, useRoute} from '@react-navigation/native';
import React, {useLayoutEffect, useState} from 'react';
import {Freeze} from 'react-freeze';

import getIsScreenBlurred from './getIsScreenBlurred';

type FreezeWrapperProps = ChildrenProps & {
    /** When true, freeze when rendered as a tab in the background (not the active tab). Use for split navigators inside Tab.Navigator. */
    freezeWhenInTabBackground?: boolean;
};

function FreezeWrapper({children, freezeWhenInTabBackground = true}: FreezeWrapperProps) {
    const currentRoute = useRoute();
    const [isAnyModalOpen] = useOnyx(ONYXKEYS.MODAL, {
        selector: (modal) => !!modal?.isVisible || !!modal?.willAlertModalBecomeVisible,
    });

    // Read the blur state from the navigation state during render rather than from a `state` event listener.
    // The `state` event is emitted from a passive effect, so it arrives after the browser has already painted
    // the commit that made the newly focused tab visible. For that paint the tab is on screen but still
    // suspended by react-freeze, so its content - including the top bar buttons - is missing for a frame.
    // `useNavigationState` notifies from a layout effect instead, which keeps the unfreeze in the same paint.
    const isScreenBlurred = useNavigationState((state) => getIsScreenBlurred(state, currentRoute.key, {freezeWhenInTabBackground}));

    const [freezed, setFreezed] = useState(false);

    // Decouple the Suspense render task so it won't be interrupted by React's concurrent mode
    // and stuck in an infinite loop
    useLayoutEffect(() => {
        if (isScreenBlurred && isAnyModalOpen) {
            return;
        }
        setFreezed(isScreenBlurred);
    }, [isAnyModalOpen, isScreenBlurred]);

    return <Freeze freeze={freezed}>{children}</Freeze>;
}

export default FreezeWrapper;

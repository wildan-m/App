import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';

import React from 'react';

import BaseFloatingCameraButton from './BaseFloatingCameraButton';

function FloatingCameraButton() {
    const {Camera: cameraIcon} = useMemoizedLazyExpensifyIcons(['Camera']);

    return <BaseFloatingCameraButton icon={cameraIcon} />;
}

export default FloatingCameraButton;

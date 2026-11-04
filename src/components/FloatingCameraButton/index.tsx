import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';

import getPlatform from '@libs/getPlatform';

import CONST from '@src/CONST';

import React from 'react';

import BaseFloatingCameraButton from './BaseFloatingCameraButton';

function FloatingCameraButton() {
    const {Camera: cameraIcon, ReceiptPlus: receiptPlusIcon} = useMemoizedLazyExpensifyIcons(['Camera', 'ReceiptPlus']);
    const icon = getPlatform(true) === CONST.PLATFORM.MOBILE_WEB ? cameraIcon : receiptPlusIcon;

    return <BaseFloatingCameraButton icon={icon} />;
}

export default FloatingCameraButton;

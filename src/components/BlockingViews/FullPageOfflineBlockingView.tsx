import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useTheme from '@hooks/useTheme';

import type ChildrenProps from '@src/types/utils/ChildrenProps';

import React from 'react';

import BlockingView from './BlockingView';

type FullPageOfflineBlockingViewProps = ChildrenProps & {
    addBottomSafeAreaPadding?: boolean;
    addOfflineIndicatorBottomSafeAreaPadding?: boolean;
};

function FullPageOfflineBlockingView({children, addBottomSafeAreaPadding = true, addOfflineIndicatorBottomSafeAreaPadding = addBottomSafeAreaPadding}: FullPageOfflineBlockingViewProps) {
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {OfflineCloud: offlineCloudIcon} = useMemoizedLazyExpensifyIcons(['OfflineCloud']);

    const theme = useTheme();

    if (isOffline) {
        return (
            <BlockingView
                icon={offlineCloudIcon}
                iconColor={theme.offline}
                title={translate('common.youAppearToBeOffline')}
                subtitle={translate('common.thisFeatureRequiresInternet')}
                addBottomSafeAreaPadding={addBottomSafeAreaPadding}
                addOfflineIndicatorBottomSafeAreaPadding={addOfflineIndicatorBottomSafeAreaPadding}
            />
        );
    }

    return children;
}

export default FullPageOfflineBlockingView;

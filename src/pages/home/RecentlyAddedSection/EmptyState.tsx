import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import HomeSectionEmptyState from '@pages/home/HomeSectionEmptyState';

import React from 'react';

function EmptyState() {
    const {translate} = useLocalize();
    const {MoneyReceipts: moneyReceiptsIllustration} = useMemoizedLazyIllustrations(['MoneyReceipts']);

    return (
        <HomeSectionEmptyState
            testID="recentlyAddedEmptyState"
            illustration={moneyReceiptsIllustration}
            title={translate('homePage.recentlyAddedSection.emptyStateTitle')}
            description={translate('homePage.recentlyAddedSection.emptyStateMessage')}
        />
    );
}

export default EmptyState;

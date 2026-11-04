import BaseWidgetItem from '@components/BaseWidgetItem';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import navigateToSubscriptionPayment from '@pages/home/common/navigateToSubscriptionPayment';

import CONST from '@src/CONST';

import React from 'react';

function FixFailedBilling() {
    const {translate} = useLocalize();
    const {CreditCard: creditCardIcon} = useMemoizedLazyExpensifyIcons(['CreditCard']);

    return (
        <BaseWidgetItem
            icon={creditCardIcon}
            title={translate('homePage.timeSensitiveSection.fixFailedBilling.title')}
            subtitle={translate('homePage.timeSensitiveSection.fixFailedBilling.subtitle')}
            ctaText={translate('homePage.timeSensitiveSection.ctaFix')}
            onCtaPress={navigateToSubscriptionPayment}
            buttonVariant={CONST.BUTTON_VARIANT.DANGER}
        />
    );
}

export default FixFailedBilling;

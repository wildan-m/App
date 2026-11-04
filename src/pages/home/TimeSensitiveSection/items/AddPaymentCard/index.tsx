import BaseWidgetItem from '@components/BaseWidgetItem';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import navigateToSubscriptionPayment from '@pages/home/common/navigateToSubscriptionPayment';

import CONST from '@src/CONST';

import React from 'react';

function AddPaymentCard() {
    const {translate} = useLocalize();
    const {CreditCard: creditCardIcon} = useMemoizedLazyExpensifyIcons(['CreditCard']);

    return (
        <BaseWidgetItem
            icon={creditCardIcon}
            title={translate('homePage.timeSensitiveSection.addPaymentCard.title')}
            subtitle={translate('homePage.timeSensitiveSection.addPaymentCard.subtitle')}
            ctaText={translate('homePage.timeSensitiveSection.addPaymentCard.cta')}
            onCtaPress={navigateToSubscriptionPayment}
            buttonVariant={CONST.BUTTON_VARIANT.SUCCESS}
        />
    );
}

export default AddPaymentCard;

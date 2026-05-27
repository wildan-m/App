import {useRoute} from '@react-navigation/native';
import React from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';
import SCREENS from '@src/SCREENS';
import BaseAddPaymentCard from './BaseAddPaymentCard';

function AddPaymentCard() {
    const route = useRoute();

    // Subscription billing is managed on web, so the subscription add-payment-card page stays blocked on native.
    // Every other route that reuses this component (e.g. the Save the World / Personal Karma payment card) should
    // render the actual form, matching the web behaviour.
    if (route.name === SCREENS.SETTINGS.SUBSCRIPTION.ADD_PAYMENT_CARD) {
        return (
            <ScreenWrapper
                testID="AddPaymentCard"
                includeSafeAreaPaddingBottom
                shouldEnableMaxHeight
            >
                <FullPageNotFoundView shouldShow />
            </ScreenWrapper>
        );
    }

    return <BaseAddPaymentCard />;
}

export default AddPaymentCard;

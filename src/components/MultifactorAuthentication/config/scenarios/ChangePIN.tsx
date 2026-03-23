import React from 'react';
import {SuccessScreenBase} from '@components/MultifactorAuthentication/components/OutcomeScreen';
import createScreenWithDefaults from '@components/MultifactorAuthentication/components/OutcomeScreen/createScreenWithDefaults';
import {DefaultClientFailureScreen, DefaultServerFailureScreen} from '@components/MultifactorAuthentication/components/OutcomeScreen/FailureScreen/defaultScreens';
import type {MultifactorAuthenticationScenarioCustomConfig} from '@components/MultifactorAuthentication/config/types';
import {useMultifactorAuthenticationState} from '@components/MultifactorAuthentication/Context';
import useOnyx from '@hooks/useOnyx';
import {changePINForCard} from '@libs/actions/MultifactorAuthentication';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

/**
 * Payload type for the CHANGE_PIN scenario.
 * Contains the new PIN and cardID for the card whose PIN is being changed.
 */
type Payload = {
    pin: string;
    cardID: string;
};

const ClientFailureScreen = createScreenWithDefaults(
    DefaultClientFailureScreen,
    {
        subtitle: 'multifactorAuthentication.changePin.didNotChange',
    },
    'ClientFailureScreen',
);

const ServerFailureScreen = createScreenWithDefaults(
    DefaultServerFailureScreen,
    {
        subtitle: 'multifactorAuthentication.changePin.didNotChange',
    },
    'ServerFailureScreen',
);

/**
 * Dynamic success screen that shows different content based on whether the card
 * is in an offline PIN market. Offline market cards need an ATM visit to activate
 * the new PIN, so we show an informational screen instead of the standard success.
 */
function ChangePINSuccessScreen() {
    const {payload} = useMultifactorAuthenticationState();
    const cardID = (payload as Payload | undefined)?.cardID;
    const [cardList] = useOnyx(ONYXKEYS.CARD_LIST);
    const card = cardList?.[cardID ?? ''];

    if (card?.isOfflinePINMarket) {
        return (
            <SuccessScreenBase
                headerTitle="cardPage.pinChangedHeader"
                title="cardPage.visitAnATM"
                subtitle="cardPage.visitAnATMDescription"
                illustration="MagicCode"
                iconWidth={variables.modalTopIconWidth}
                iconHeight={variables.modalTopIconHeight}
            />
        );
    }

    return (
        <SuccessScreenBase
            headerTitle="cardPage.pinChangedHeader"
            title="cardPage.pinChanged"
            subtitle="cardPage.pinChangedDescription"
            illustration="Fireworks"
            iconWidth={variables.openPadlockWidth}
            iconHeight={variables.openPadlockHeight}
        />
    );
}

ChangePINSuccessScreen.displayName = 'ChangePINSuccessScreen';

/**
 * Configuration for the CHANGE_PIN multifactor authentication scenario.
 * This scenario is used when a UK/EU cardholder changes the PIN of their physical card.
 */
export default {
    allowedAuthenticationMethods: [CONST.MULTIFACTOR_AUTHENTICATION.TYPE.BIOMETRICS, CONST.MULTIFACTOR_AUTHENTICATION.TYPE.PASSKEYS],
    action: changePINForCard,
    successScreen: <ChangePINSuccessScreen />,
    defaultClientFailureScreen: <ClientFailureScreen />,
    defaultServerFailureScreen: <ServerFailureScreen />,
} as const satisfies MultifactorAuthenticationScenarioCustomConfig<Payload>;

export type {Payload};

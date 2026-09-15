import Button from '@components/Button';
import ConfirmationPage from '@components/ConfirmationPage';
import LottieAnimations from '@components/LottieAnimations';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

import TwoFactorAuthWrapper from './TwoFactorAuthWrapper';

type SuccessPageBaseProps = {
    onButtonPress: () => void;
    onBackButtonPress?: () => void;
};

function SuccessPageBase({onButtonPress, onBackButtonPress}: SuccessPageBaseProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <TwoFactorAuthWrapper
            stepName={CONST.TWO_FACTOR_AUTH_STEPS.SUCCESS}
            title={translate('twoFactorAuth.headerTitle')}
            onBackButtonPress={onBackButtonPress}
        >
            <ConfirmationPage
                illustration={LottieAnimations.Fireworks}
                heading={translate('twoFactorAuth.enabled')}
                description={translate('twoFactorAuth.congrats')}
                primaryButtonComponent={
                    <ConfirmationPage.Button
                        variant={CONST.BUTTON_VARIANT.SUCCESS}
                        testID="confirmation-primary-button"
                        onPress={onButtonPress}
                    >
                        <Button.KeyboardShortcut />
                        <Button.Text>{translate('common.buttonConfirm')}</Button.Text>
                    </ConfirmationPage.Button>
                }
                containerStyle={styles.flex1}
            />
        </TwoFactorAuthWrapper>
    );
}

export default SuccessPageBase;

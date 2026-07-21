import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {StepCounterParams} from '@src/languages/params';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';

import HeaderBackButton from './BackButton';
import HeaderProgressBar from './ProgressBar';
import HeaderRoot from './Root';

type WizardHeaderProps = {
    /** 0 - 100 number indicating current progress of the wizard */
    progressBarPercentage: number;

    /** Data to announce a step counter for the progress bar */
    stepCounter?: StepCounterParams;

    /** Method to trigger when pressing the back button; defaults to Navigation.goBack() */
    onBackButtonPress?: () => void;

    /** Whether to show the back button */
    shouldShowBackButton?: boolean;

    /** Additional styles for the header bar */
    style?: StyleProp<ViewStyle>;
};

/**
 * Preset for wizard / onboarding flows: back button + centered progress bar with a step-counter label.
 */
function WizardHeader({progressBarPercentage, stepCounter, onBackButtonPress, shouldShowBackButton = true, style}: WizardHeaderProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const progressBarLabel = stepCounter ? `${translate('common.progressBarLabel')}, ${translate('stepCounter', stepCounter)}` : undefined;

    return (
        <HeaderRoot style={[styles.pl0, shouldShowBackButton && styles.pl2, style]}>
            {shouldShowBackButton && <HeaderBackButton onPress={onBackButtonPress} />}
            <HeaderProgressBar
                percentage={progressBarPercentage}
                accessibilityLabel={progressBarLabel}
            />
        </HeaderRoot>
    );
}

export default WizardHeader;
export type {WizardHeaderProps};

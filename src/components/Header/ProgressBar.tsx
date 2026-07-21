import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type HeaderProgressBarProps = {
    /** 0 - 100 number indicating current progress of the progress bar */
    percentage: number;

    /** Accessibility label announced for the progress bar */
    accessibilityLabel?: string;
};

function HeaderProgressBar({percentage, accessibilityLabel}: HeaderProgressBarProps) {
    const styles = useThemeStyles();

    return (
        <>
            {/* Reserves as much space for the progress bar as possible */}
            <View style={styles.flexGrow1} />
            {/* Uses absolute positioning so that it's always centered instead of being affected by the
            presence or absence of back/close buttons to the left/right of it */}
            <View style={styles.headerProgressBarContainer}>
                <View
                    style={styles.headerProgressBar}
                    accessible={!!accessibilityLabel}
                    accessibilityLabel={accessibilityLabel}
                    role={CONST.ROLE.PROGRESSBAR}
                    aria-valuetext={accessibilityLabel}
                >
                    <View
                        aria-hidden
                        style={[{width: `${percentage}%`}, styles.headerProgressBarFill]}
                    />
                </View>
            </View>
        </>
    );
}

export default HeaderProgressBar;
export type {HeaderProgressBarProps};

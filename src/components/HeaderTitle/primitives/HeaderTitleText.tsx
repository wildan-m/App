import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import type {StyleProp, TextStyle} from 'react-native';

import React from 'react';

type HeaderTitleTextProps = {
    /** The title text */
    children?: string;

    /** Number of lines to display for the title */
    numberOfLines?: number;

    /** Additional text styles */
    style?: StyleProp<TextStyle>;
};

function HeaderTitleText({children = '', numberOfLines = 2, style}: HeaderTitleTextProps) {
    const styles = useThemeStyles();

    // Render nothing for an empty title so no empty row shifts the rest of the block
    if (!children) {
        return null;
    }

    return (
        <Text
            numberOfLines={numberOfLines}
            style={[styles.headerText, styles.textLarge, styles.lineHeightXLarge, style]}
            accessibilityRole={CONST.ROLE.HEADER}
            accessibilityLabel={children}
        >
            {children}
        </Text>
    );
}

export default HeaderTitleText;
export type {HeaderTitleTextProps};

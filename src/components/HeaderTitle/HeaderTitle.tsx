import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

import type HeaderTitleProps from './types';

function HeaderTitle({children, style, containerStyles = []}: HeaderTitleProps) {
    const styles = useThemeStyles();

    return (
        <View style={[styles.flex1, styles.flexRow, containerStyles]}>
            <View style={[styles.mw100, style]}>{children}</View>
        </View>
    );
}

export default HeaderTitle;

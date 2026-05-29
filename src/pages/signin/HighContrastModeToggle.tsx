import React from 'react';
import {View} from 'react-native';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getBaseTheme, getContrastTheme, isHighContrastTheme} from '@styles/theme/utils';
import {updateTheme} from '@userActions/User';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

function HighContrastModeToggle() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [preferredTheme] = useOnyx(ONYXKEYS.PREFERRED_THEME);

    const currentTheme = preferredTheme ?? CONST.THEME.DEFAULT;
    const isHighContrast = isHighContrastTheme(currentTheme);
    const currentBaseTheme = getBaseTheme(currentTheme);

    const onToggleHighContrast = (enabled: boolean) => {
        const newTheme = enabled ? getContrastTheme(currentBaseTheme) : currentBaseTheme;
        updateTheme(newTheme, false);
    };

    return (
        <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentBetween]}>
            <Text style={[styles.textExtraSmallSupporting, styles.mr2]}>{translate('themePage.highContrastMode')}</Text>
            <Switch
                accessibilityLabel={translate('themePage.highContrastMode')}
                isOn={isHighContrast}
                onToggle={onToggleHighContrast}
            />
        </View>
    );
}

export default HighContrastModeToggle;

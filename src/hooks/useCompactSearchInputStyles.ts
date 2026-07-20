import variables from '@styles/variables';

import {useMemo} from 'react';

import useTheme from './useTheme';
import useThemeStyles from './useThemeStyles';

/**
 * Style props for the small search input, originally introduced above tables and now also used by the
 * search inputs rendered inside popover menus (Spend page filters, emoji picker).
 *
 * Two heights are supported: a shorter one for web/desktop and a taller one for narrow/mobile layouts.
 *
 * @param shouldUseNarrowLayout Whether the taller mobile height should be used.
 * @param isFocused Whether the input currently has focus, used to highlight the border.
 */
function useCompactSearchInputStyles(shouldUseNarrowLayout: boolean, isFocused: boolean) {
    const theme = useTheme();
    const styles = useThemeStyles();

    return useMemo(
        () => ({
            inputStyle: styles.textLabel,
            placeholderTextColor: theme.textSupporting,
            textInputContainerStyles: [styles.border, styles.borderRadiusComponentNormal, styles.appBG, styles.p2, isFocused && styles.borderColorFocus],
            touchableInputWrapperStyle: [!shouldUseNarrowLayout ? styles.h8 : styles.h11],
            clearButtonStyle: shouldUseNarrowLayout ? undefined : styles.mr0,
            clearButtonIconSize: shouldUseNarrowLayout ? undefined : variables.iconSizeSmall,
        }),
        [
            isFocused,
            shouldUseNarrowLayout,
            styles.appBG,
            styles.border,
            styles.borderColorFocus,
            styles.borderRadiusComponentNormal,
            styles.h11,
            styles.h8,
            styles.mr0,
            styles.p2,
            styles.textLabel,
            theme.textSupporting,
        ],
    );
}

export default useCompactSearchInputStyles;

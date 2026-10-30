import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import type {NativeTabName} from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/NATIVE_TAB_GLYPHS';
import getTabBarIcon from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/tabIconRasterizer';
import type {TabIconLayout} from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/tabIconRasterizer';

import variables from '@styles/variables';

import type {NativeBottomTabNavigationOptions} from '@react-navigation/bottom-tabs/unstable';

import type NativeTabBarOptionsParams from './types';

/** Material's bar sits above the system gesture inset, so the floating buttons clear both. */
const getFloatingButtonsBottom = (bottomInset: number) => variables.androidNativeTabBarFloatingButtonsBottom + bottomInset;

/**
 * Material draws each icon in its fixed icon slot, with a label of its own. The status dot is drawn into the icon rather
 * than as a Material badge, because RNScreens paints every badge in the badge color of the selected tab.
 */
const TAB_ICON_LAYOUT: TabIconLayout = {
    glyphSize: variables.iconBottomBar,
    iconBoxSize: variables.iconBottomBar,
    direction: 'stacked',
};

function useNativeTabBarOptions({dotColors, tabLabels}: NativeTabBarOptionsParams) {
    const theme = useTheme();
    const styles = useThemeStyles();

    // The tint only reaches the labels, since the icons arrive already recolored (react-native-screens patch 004).
    const screenOptions: NativeBottomTabNavigationOptions = {
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSupporting,
        tabBarLabelStyle: {fontFamily: styles.textSmall.fontFamily, fontSize: styles.textSmall.fontSize},
        tabBarActiveIndicatorColor: theme.androidTabBarActiveIndicatorBG,
        tabBarLabelVisibilityMode: 'labeled',
        // The bar's visibility is set on the focused tab alone (see TabNavigator), so hiding the bar leaves the other tabs as they are.
        tabBarStyle: {backgroundColor: theme.appBG},
    };

    const getTabOptions = (name: NativeTabName): NativeBottomTabNavigationOptions => ({
        tabBarLabel: tabLabels[name],
        tabBarIcon: getTabBarIcon(TAB_ICON_LAYOUT, (isSelected) => ({
            name,
            color: isSelected ? theme.iconMenu : theme.icon,
            dotColor: dotColors[name],
        })),
    });

    return {screenOptions, getTabOptions};
}

export default useNativeTabBarOptions;
export {getFloatingButtonsBottom};

import {Animated} from 'react-native';
import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../styles/styles';
import PressableWithFeedback from '../Pressable/PressableWithFeedback';
import TabIcon from './TabIcon';
import TabLabel from './TabLabel';
import CONST from '../../CONST';
import * as StyleUtils from '../../styles/StyleUtils';
import Hoverable from '../Hoverable';
import getButtonState from '../../libs/getButtonState';
import stylePropTypes from '../../styles/stylePropTypes';
import Icon from '../Icon';

const propTypes = {
    /** Function to call when onPress */
    onPress: PropTypes.func,

    /** Icon to display on tab */
    icon: PropTypes.func,

    /** Title of the tab */
    title: PropTypes.string,

    /** Animated background color value for the tab button */
    // eslint-disable-next-line
    backgroundColor: PropTypes.any,

    /** Animated opacity value while the label is inactive state */
    // eslint-disable-next-line
    inactiveOpacity: PropTypes.any,

    /** Animated opacity value while the label is in active state */
    // eslint-disable-next-line
    activeOpacity: PropTypes.any,

    /** Used to apply offline styles to child text components */
    style: stylePropTypes,

    /** Whether item is focused or active */
    focused: PropTypes.bool,

    /** Should we disable this menu item? */
    disabled: PropTypes.bool,

    /** Whether the menu item should be interactive at all */
    interactive: PropTypes.bool,

    /** Any adjustments to style when menu item is hovered or pressed */
    hoverAndPressStyle: PropTypes.arrayOf(PropTypes.object),

    /** Should we grey out the menu item when it is disabled? */
    shouldGreyOutWhenDisabled: PropTypes.bool,

    /** A boolean flag that gives the icon a green fill if true */
    success: PropTypes.bool,

};

const defaultProps = {
    onPress: () => {},
    icon: () => {},
    title: '',
    backgroundColor: '',
    inactiveOpacity: 1,
    activeOpacity: 0,
    style: styles.tabSelectorButton,
    interactive: true,
    hoverAndPressStyle: [],
    shouldGreyOutWhenDisabled: true,
    success: false,
    disabled: false,
    focused: false,
};

const AnimatedPressableWithFeedback = Animated.createAnimatedComponent(PressableWithFeedback);

function TabSelectorItem({
    icon,
    title,
    onPress,
    backgroundColor,
    activeOpacity,
    inactiveOpacity,
    style,
    interactive,
    hoverAndPressStyle,
    shouldGreyOutWhenDisabled,
    success,
    disabled,
    focused,
}) {
    return (
        <Hoverable>
            {(isHovered) => (
                <Animated.View style={[styles.flex1]}>
                    <PressableWithFeedback
                        accessibilityLabel={title}
                        style={({ pressed }) => [
                            { backgroundColor },
                            style,
                            !interactive && styles.cursorDefault,
                            StyleUtils.getButtonBackgroundColorStyle(getButtonState(focused || isHovered, pressed, success, disabled, interactive), true),
                            (isHovered || pressed) && hoverAndPressStyle,
                            shouldGreyOutWhenDisabled && disabled && styles.buttonOpacityDisabled,
                        ]}

                        wrapperStyle={[styles.flex1]}
                        onPress={onPress}

                    // hoverDimmingValue={1}
                    // pressDimmingValue={1}
                    // hoverStyle={StyleUtils.getButtonBackgroundColorStyle(CONST.BUTTON_STATES.ACTIVE)}
                    // pressStyle={StyleUtils.getButtonBackgroundColorStyle(CONST.BUTTON_STATES.PRESSED)}
                    >
                        {({ pressed }) => (
                            <>
                                <Icon
                                src={icon}
                                fill={StyleUtils.getIconFillColor(getButtonState(focused || isHovered, pressed, success, disabled, interactive), true)}
                            />

                                <TabIcon
                                    icon={icon}
                                    activeOpacity={activeOpacity}
                                    inactiveOpacity={inactiveOpacity}
                                />
                                <TabLabel
                                    title={title}
                                    activeOpacity={activeOpacity}
                                    inactiveOpacity={inactiveOpacity}
                                />
                            </>)}

                    </PressableWithFeedback>
                </Animated.View>
            )}
        </Hoverable>
    );
}

TabSelectorItem.propTypes = propTypes;
TabSelectorItem.defaultProps = defaultProps;
TabSelectorItem.displayName = 'TabSelectorItem';

export default TabSelectorItem;

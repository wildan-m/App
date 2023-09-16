import {Animated, View, StyleSheet} from 'react-native';
import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../styles/styles';
import PressableWithFeedback from '../Pressable/PressableWithFeedback';
import TabIcon from './TabIcon';
import TabLabel from './TabLabel';
import Hoverable from '../Hoverable';
import themeColors from '../../styles/themes/default';

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
};

const defaultProps = {
    onPress: () => {},
    icon: () => {},
    title: '',
    backgroundColor: '',
    inactiveOpacity: 1,
    activeOpacity: 0,
};

const AnimatedPressableWithFeedback = Animated.createAnimatedComponent(PressableWithFeedback);

function TabSelectorItem({ icon, title, onPress, backgroundColor, activeOpacity, inactiveOpacity }) {
    const hoveredBackgroundColor = { backgroundColor: themeColors.midtone };
    const interpolatedBackgroundColor = { backgroundColor };
    return (
        <View style={[styles.flex1]}>
            <Hoverable>
                {(hovered) => {
                    console.log(`[wildebug] hovered ${title}`, hovered);
                    return (
                        <AnimatedPressableWithFeedback
                            key={'hoveredSelectorItem'}
                            accessibilityLabel={title}
                            style={[
                                styles.tabSelectorButton,
                                hovered ? hoveredBackgroundColor : { backgroundColor },
                            ]}
                            onPress={onPress}
                        >
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
                        </AnimatedPressableWithFeedback>
                    )
                }
                }
            </Hoverable>
        </View>
    );
}

TabSelectorItem.propTypes = propTypes;
TabSelectorItem.defaultProps = defaultProps;
TabSelectorItem.displayName = 'TabSelectorItem';

export default TabSelectorItem;

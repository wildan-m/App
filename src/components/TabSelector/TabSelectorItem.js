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

    routesLength: PropTypes.number,
};

const defaultProps = {
    onPress: () => {},
    icon: () => {},
    title: '',
    backgroundColor: '',
    inactiveOpacity: 1,
    activeOpacity: 0,
    routesLength: 0,
    position: {
        interpolate: () => {},
    },
};

const AnimatedPressableWithFeedback = Animated.createAnimatedComponent(PressableWithFeedback);
const getBackgroundColor = (position, routesLength, tabIndex, hovered) => {
    if (routesLength > 1) {
        const inputRange = Array.from({length: routesLength}, (v, i) => i);
console.log('[wildebug], inputRange', inputRange)
console.log('[wildebug], outputRange', _.map(inputRange, (i) => (i === tabIndex || hovered ? themeColors.border : themeColors.appBG)))
console.log('[wildebug], hovered', hovered)
        return position.interpolate({
            inputRange,
            outputRange: _.map(inputRange, (i) => (i === tabIndex || hovered ? themeColors.border : themeColors.appBG)),
        });
    }
    return themeColors.border;
};

const getOpacity = (position, routesLength, tabIndex, active, hovered) => {
    const activeValue = active ? 1 : 0;
    const inactiveValue = active ? 0 : 1;

    if (routesLength > 1) {
        const inputRange = Array.from({length: routesLength}, (v, i) => i);

        return position.interpolate({
            inputRange,
            outputRange: _.map(inputRange, (i) => (i === tabIndex || hovered? activeValue : inactiveValue)),
        });
    }
    return activeValue;
};

function TabSelectorItem({ icon, title, onPress, backgroundColor, position, routesLength, tabIndex }) {
    // const hoveredBackgroundColor = { backgroundColor: themeColors.midtone };
    // const interpolatedBackgroundColor = { backgroundColor };

    return (
        <View style={[styles.flex1]}>
            <Hoverable>
                {(hovered) => {
                    console.log(`[wildebug] hovered ${title}`, hovered);
                    const backgroundColor = getBackgroundColor(position, routesLength, tabIndex, hovered);
                    const activeOpacity = getOpacity(position, routesLength, tabIndex, true, hovered);
                    const inactiveOpacity = getOpacity(position, routesLength, tabIndex, false, hovered);
    
                    return (
                        <AnimatedPressableWithFeedback
                            key={'hoveredSelectorItem'}
                            accessibilityLabel={title}
                            style={[
                                styles.tabSelectorButton,
                                { backgroundColor },
                                // hovered ? hoveredBackgroundColor : { backgroundColor },
                            ]}
                            // wrapperStyle={[styles.flex1]}
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

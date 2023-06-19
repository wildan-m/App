import React, {useState, useRef, useEffect} from 'react';
import {View, Pressable, Animated} from 'react-native';
import PropTypes from 'prop-types';
import styles from '../styles/styles';
import themeColors from '../styles/themes/default';
import stylePropTypes from '../styles/stylePropTypes';
import Icon from './Icon';
import * as Expensicons from './Icon/Expensicons';

const propTypes = {
    /** Whether checkbox is checked */
    isChecked: PropTypes.bool,

    /** A function that is called when the box/label is pressed */
    onPress: PropTypes.func.isRequired,

    /** Should the input be styled for errors  */
    hasError: PropTypes.bool,

    /** Should the input be disabled  */
    disabled: PropTypes.bool,

    /** Children (icon) for Checkbox */
    children: PropTypes.node,

    /** Additional styles to add to checkbox button */
    style: stylePropTypes,

    /** Additional styles to add to checkbox container */
    containerStyle: stylePropTypes,

    /** Callback that is called when mousedown is triggered. */
    onMouseDown: PropTypes.func,

    /** A ref to forward to the Pressable */
    forwardedRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({current: PropTypes.instanceOf(React.Component)})]),
};

const defaultProps = {
    isChecked: false,
    hasError: false,
    disabled: false,
    style: [],
    containerStyle: [],
    forwardedRef: undefined,
    children: null,
    onMouseDown: undefined,
};

function Checkbox(props) {
    const [isFocused, setIsFocused] = useState(false);
    const borderColorValue = useRef(new Animated.Value(0)).current;
    const blinkingAnimation = useRef(Animated.loop(
        Animated.sequence([
          Animated.timing(borderColorValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.delay(500),
          Animated.timing(borderColorValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.delay(500),
        ]),
        { iterations: -1 }
      )).current;


    
    useEffect(() => {
      if (props.hasError && isFocused) {
        startBlinking();
      } else {
        stopBlinking();
      }
    }, [props.hasError, isFocused]);
  
    const startBlinking = () => {
        blinkingAnimation.start();
    };
  
    const stopBlinking = () => {
        blinkingAnimation.stop();
        blinkingAnimation.reset();
        borderColorValue.setValue(0);
    };
  
    const handleFocus = () => {
      setIsFocused(true);
    };
  
    const handleBlur = () => {
      setIsFocused(false);
    };
  
    const interpolatedColor = borderColorValue.interpolate({
      inputRange: [0, 1],
      outputRange: [styles.borderFocus, styles.borderColorDanger.borderColor], // Customize the border color here
    });
  

    
    const handleSpaceKey = (event) => {
        if (event.code !== 'Space') {
            return;
        }

        props.onPress();
    };

    const firePressHandlerOnClick = (event) => {
        // Pressable can be triggered with Enter key and by a click. As this is a checkbox,
        // We do not want to toggle it, when Enter key is pressed.
        if (event.type && event.type !== 'click') {
            return;
        }

        props.onPress();
    };

    return (
        <Pressable
            disabled={props.disabled}
            onPress={firePressHandlerOnClick}
            onMouseDown={props.onMouseDown}
            ref={props.forwardedRef}
            style={props.style}
            onKeyDown={handleSpaceKey}
            accessibilityRole="checkbox"
            accessibilityState={{checked: props.isChecked}}
            onFocus={handleFocus}
            onBlur={handleBlur}
        >
            {props.children ? (
                props.children
            ) : (
                <Animated.View
                    style={[
                        styles.checkboxContainer,
                        props.containerStyle,
                        props.isChecked && styles.checkedContainer,
                        //props.hasError && styles.borderColorDanger,
                        props.disabled && styles.cursorDisabled,
                        props.isChecked && styles.borderColorFocus,
                        {borderColor: interpolatedColor},
                    ]}
                    // Used as CSS selector to customize focus-visible style
                    dataSet={{checkbox: true}}
                >
                    {props.isChecked && (
                        <Icon
                            src={Expensicons.Checkmark}
                            fill={themeColors.textLight}
                            height={14}
                            width={14}
                        />
                    )}
                </Animated.View>
            )}
        </Pressable>
    );
}

Checkbox.propTypes = propTypes;
Checkbox.defaultProps = defaultProps;
Checkbox.displayName = 'Checkbox';

export default Checkbox;

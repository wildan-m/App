import {Keyboard, View, PanResponder, InteractionManager} from 'react-native';
import React from 'react';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import {PickerAvoidingView} from 'react-native-picker-select';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import CONST from '../../CONST';
import styles from '../../styles/styles';
import HeaderGap from '../HeaderGap';
import OfflineIndicator from '../OfflineIndicator';
import compose from '../../libs/compose';
import withNavigation from '../withNavigation';
import {withNetwork} from '../OnyxProvider';
import {propTypes, defaultProps} from './propTypes';
import SafeAreaConsumer from '../SafeAreaConsumer';
import TestToolsModal from '../TestToolsModal';
import withKeyboardState from '../withKeyboardState';
import withWindowDimensions from '../withWindowDimensions';
import withEnvironment from '../withEnvironment';
import withNavigationFocus from '../withNavigationFocus';
import toggleTestToolsModal from '../../libs/actions/TestTool';
import CustomDevMenu from '../CustomDevMenu';
import * as Browser from '../../libs/Browser';

class ScreenWrapper extends React.Component {
    constructor(props) {
        super(props);

        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponderCapture: (e, gestureState) => gestureState.numberActiveTouches === CONST.TEST_TOOL.NUMBER_OF_TAPS,
            onPanResponderRelease: toggleTestToolsModal,
        });

        this.keyboardDissmissPanResponder = PanResponder.create({
            onMoveShouldSetPanResponderCapture: (e, gestureState) => {
                const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
                const shouldDismissKeyboard = this.props.shouldDismissKeyboardBeforeClose && this.props.isKeyboardShown && Browser.isMobile();
                return isHorizontalSwipe && shouldDismissKeyboard;
            },
            onPanResponderGrant: Keyboard.dismiss,
        });

        this.state = {
            didScreenTransitionEnd: false,
            minHeight: props.initialWindowHeight,
            isKeyboardCompletelyClosed: false,
        };
    }

    static getDerivedStateFromProps(props, state){
// //// console.log('[debug] getDerivedStateFromProps ${props.code}`)
// //// console.log('[debug] props ${props.code}`, props)
// //// console.log('[debug] state ${props.code}`, state)
// //// console.log('[debug] props.isFocused ${props.code}`, props.isFocused)
        if (!props.isFocused)
        {
// //// console.log('[debug] return { minHeight: props.initialWindowHeight} ${props.code}`, props.initialWindowHeight)

            // return { minHeight: props.initialWindowHeight}
            return { minHeight: props.initialWindowHeight, isKeyboardCompletelyClosed: false}
        }
        return null;
    }

    componentDidMount() {
// //// console.log('[debug] componentDidMount ${this.props.code}`)

        this.unsubscribeTransitionEnd = this.props.navigation.addListener('transitionEnd', (event) => {
            // //// console.log('[debug] smkdms transitionEnd ${this.props.code}`)

// Prevent firing the prop callback when user is exiting the page.
            if (lodashGet(event, 'data.closing')) {
                return;
            }

            // // Restore min-height to allow floating button when keyboard appeared
            // if (!this.props.isFocused
            //     // keyboardHeight is for native device. Native device doesn't resize windowHeight when keyboard shown
            //     || (this.props.windowHeight - this.props.keyboardHeight !== this.props.initialWindowHeight)
            // ) {
            //     return;
            // }

            const newState = { didScreenTransitionEnd: true };
            // if (this.state.minHeight !== this.props.style.minHeight) {
            //     newState.minHeight = this.props.style.minHeight;
            // }


            this.setState(newState);

            this.props.onEntryTransitionEnd();
        });



        // We need to have this prop to remove keyboard before going away from the screen, to avoid previous screen look weird for a brief moment,
        // also we need to have generic control in future - to prevent closing keyboard for some rare cases in which beforeRemove has limitations
        // described here https://reactnavigation.org/docs/preventing-going-back/#limitations
        if (this.props.shouldDismissKeyboardBeforeClose) {
            this.beforeRemoveSubscription = this.props.navigation.addListener('beforeRemove', () => {
// //// console.log('[debug] smkdms beforeRemove ${this.props.code}`)

                if (!this.props.isKeyboardShown) {
                    return;
                }
                Keyboard.dismiss();
            });
        }

        // this.transitionStartSubscription = this.props.navigation.addListener('transitionStart', () => {
        //     // //// console.log('[debug] smkdms transitionStart ${this.props.code}`)
        // });
        // this.focusSubscription = this.props.navigation.addListener('focus', () => {
        //     // //// console.log('[debug] smkdms focus ${this.props.code}`)
        // });
            
    }

    componentDidUpdate(prevProps, prevState) {
        // //// console.log('[debug] componentDidUpdate ${this.props.code}`)
        // //// console.log('[debug] prevProps ${this.props.code}`, prevProps)
        // //// console.log('[debug] this.props ${this.props.code}`, this.props)
        // //// console.log('[debug] prevState ${this.props.code}`, prevState)
        // //// console.log('[debug] this.state ${this.props.code}`, this.state)
        // //// console.log('[debug] this.state.didScreenTransitionEnd ${this.props.code}`, this.state.didScreenTransitionEnd)


        // Restore min-height to allow floating button when keyboard appeared
        if (this.props.isFocused
        // keyboardHeight is for native device. Native device doesn't resize windowHeight when keyboard shown
            && (this.props.windowHeight - this.props.keyboardHeight === this.props.initialWindowHeight)
           
        ) {
            const state = {isKeyboardCompletelyClosed: true};

            if(this.state.minHeight !== this.props.style.minHeight)
            {
                state.minHeight = this.props.style.minHeight;
            }
            this.setState(state);
        }
    }

    /**
     * We explicitly want to ignore if props.modal changes, and only want to rerender if
     * any of the other props **used for the rendering output** is changed.
     * @param {Object} nextProps
     * @param {Object} nextState
     * @returns {boolean}
     */
    shouldComponentUpdate(nextProps, nextState) {
        // //// console.log('[debug] shouldComponentUpdate ${this.props.code}`)
        // //// console.log('[debug] this.props ${this.props.code}`, this.props)
        // //// console.log('[debug] nextProps ${this.props.code}`, nextProps)
        // //// console.log('[debug] this.state ${this.props.code}`, this.state)
        // //// console.log('[debug] nextState ${this.props.code}`, nextState)

        return !_.isEqual(this.state, nextState) || !_.isEqual(_.omit(this.props, 'modal'), _.omit(nextProps, 'modal'));
    }

    componentWillUnmount() {
        // //// console.log('[debug] componentWillUnmount ${this.props.code}`)

        if (this.unsubscribeTransitionEnd) {
            this.unsubscribeTransitionEnd();
        }
        if (this.beforeRemoveSubscription) {
            this.beforeRemoveSubscription();
        }
        if (this.transitionStartSubscription) {
            this.transitionStartSubscription();
        }
        if (this.focusSubscription) {
            this.focusSubscription();
        }
    }

    render() {
        // //// console.log('[debug] render ${this.props.code}`)

        const maxHeight = this.props.shouldEnableMaxHeight ? this.props.windowHeight : undefined;
        return (
            <SafeAreaConsumer>
                {({insets, paddingTop, paddingBottom, safeAreaPaddingBottomStyle}) => {
                    const paddingStyle = {};

                    if (this.props.includePaddingTop) {
                        paddingStyle.paddingTop = paddingTop;
                    }

                    // We always need the safe area padding bottom if we're showing the offline indicator since it is bottom-docked.
                    if (this.props.includeSafeAreaPaddingBottom || this.props.network.isOffline) {
                        paddingStyle.paddingBottom = paddingBottom;
                    }

                    // we should also add vertical padding to the min height
                    const minHeight = this.state.minHeight === undefined? undefined: this.state.minHeight - paddingStyle.paddingTop || 0 - paddingStyle.paddingBottom || 0;
// //// console.log('[debug] minHeight ${this.props.code}`, minHeight)
// //// console.log('[debug] this.props.isFocused ${this.props.code}`, this.props.isFocused)
// //// console.log('[debug] this.props.isKeyboardShown ${this.props.code}`, this.props.isKeyboardShown)
// //// console.log('[debug] this.state.didScreenTransitionEnd ${this.props.code}`, this.state.didScreenTransitionEnd)
//// console.log('[debug] maxHeight', maxHeight)
                    return (
                        <View
                            style={styles.flex1}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...(this.props.environment === CONST.ENVIRONMENT.DEV ? this.panResponder.panHandlers : {})}
                        >
                            <View
                                style={[...this.props.style, styles.flex1, paddingStyle]}
                                // eslint-disable-next-line react/jsx-props-no-spreading
                                {...this.keyboardDissmissPanResponder.panHandlers}
                            >
                                <KeyboardAvoidingView
                                    style={[styles.w100, styles.h100, {maxHeight}]}
                                    behavior={this.props.keyboardAvoidingViewBehavior}
                                    enabled={this.props.shouldEnableKeyboardAvoidingView}
                                >
                                    <PickerAvoidingView
                                        style={styles.flex1}
                                        enabled={this.props.shouldEnablePickerAvoiding}
                                    >
                                        <HeaderGap />
                                        {this.props.environment === CONST.ENVIRONMENT.DEV && <TestToolsModal />}
                                        {this.props.environment === CONST.ENVIRONMENT.DEV && <CustomDevMenu />}
                                        {
                                            // If props.children is a function, call it to provide the insets to the children.
                                            _.isFunction(this.props.children)
                                                ? this.props.children({
                                                      insets,
                                                      safeAreaPaddingBottomStyle,
                                                      didScreenTransitionEnd: this.state.didScreenTransitionEnd,
                                                  })
                                                : this.props.children
                                        }
                                        {this.props.isSmallScreenWidth && this.props.shouldShowOfflineIndicator && <OfflineIndicator style={this.props.offlineIndicatorStyle} />}
                                    </PickerAvoidingView>
                                </KeyboardAvoidingView>
                            </View>
                        </View>
                    );
                }}
            </SafeAreaConsumer>
        );
    }
}

ScreenWrapper.propTypes = propTypes;
ScreenWrapper.defaultProps = defaultProps;

export default compose(withNavigation, withNavigationFocus, withEnvironment, withWindowDimensions, withKeyboardState, withNetwork())(ScreenWrapper);
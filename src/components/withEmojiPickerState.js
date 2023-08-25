/* eslint-disable react/no-unused-state */
import React, {forwardRef, createContext} from 'react';
import PropTypes from 'prop-types';
import {EmojiPicker} from 'react-native';
import getComponentDisplayName from '../libs/getComponentDisplayName';

const EmojiPickerStateContext = createContext(null);
const emojiPickerStatePropTypes = {
    /** Whether or not the emojiPicker is open */
    isEmojiPickerShown: PropTypes.bool.isRequired,
};

const emojiPickerStateProviderPropTypes = {
    /* Actual content wrapped by this component */
    children: PropTypes.node.isRequired,
};

class EmojiPickerStateProvider extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isEmojiPickerShown: false,
        };
    }

    componentDidMount() {
        this.emojiPickerDidShowListener = EmojiPicker.addListener('emojiPickerDidShow', () => {
            this.setState({isEmojiPickerShown: true});
        });
        this.emojiPickerDidHideListener = EmojiPicker.addListener('emojiPickerDidHide', () => {
            this.setState({isEmojiPickerShown: false});
        });
    }

    componentWillUnmount() {
        this.emojiPickerDidShowListener.remove();
        this.emojiPickerDidHideListener.remove();
    }

    render() {
        return <EmojiPickerStateContext.Provider value={this.state}>{this.props.children}</EmojiPickerStateContext.Provider>;
    }
}

EmojiPickerStateProvider.propTypes = emojiPickerStateProviderPropTypes;

/**
 * @param {React.Component} WrappedComponent
 * @returns {React.Component}
 */
export default function withEmojiPickerState(WrappedComponent) {
    const WithEmojiPickerState = forwardRef((props, ref) => (
        <EmojiPickerStateContext.Consumer>
            {(emojiPickerStateProps) => (
                <WrappedComponent
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...emojiPickerStateProps}
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...props}
                    ref={ref}
                />
            )}
        </EmojiPickerStateContext.Consumer>
    ));

    WithEmojiPickerState.displayName = `withEmojiPickerState(${getComponentDisplayName(WrappedComponent)})`;
    return WithEmojiPickerState;
}

export {EmojiPickerStateProvider, emojiPickerStatePropTypes, EmojiPickerStateContext};

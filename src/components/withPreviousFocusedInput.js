import React, {createContext, forwardRef, useCallback, useState, useMemo} from 'react';
import PropTypes from 'prop-types';

import getComponentDisplayName from '../libs/getComponentDisplayName';
import Navigation from '../libs/Navigation/Navigation';

const PreviousFocusedInputContext = createContext(null);

const withPreviousFocusedInputPropTypes = {
    /** Function to update the state */
    updatePreviousFocusedInput: PropTypes.func,

    /** The top most report id */
    previousFocusedInput: PropTypes.object,
};

const withPreviousFocusedInputDefaultProps = {
    previousFocusedInput: {},
};

function PreviousFocusedInputContextProvider(props) {
    const [previousFocusedInput, setPreviousFocusedInput] = useState({});

    /**
     * This function is used to update the previousFocusedInput
     * @param {Object} state root navigation state
     */
    const updatePreviousFocusedInput = //useCallback(
        (state) => {
            setPreviousFocusedInput(state);
        };//,
      //  [setPreviousFocusedInput],
    //);

    /**
     * The context this component exposes to child components
     * @returns {Object} previousFocusedInput to share between central pane and LHN
     */
    const contextValue = 
    // useMemo(
    //     () => (
            {
            updatePreviousFocusedInput,
            previousFocusedInput,
        }
    //     ),
    //     [updatePreviousFocusedInput, previousFocusedInput],
    // );

    return <PreviousFocusedInputContext.Provider value={contextValue}>{props.children}</PreviousFocusedInputContext.Provider>;
}

PreviousFocusedInputContextProvider.displayName = 'PreviousFocusedInputContextProvider';
PreviousFocusedInputContextProvider.propTypes = {
    /** Actual content wrapped by this component */
    children: PropTypes.node.isRequired,
};

export default function withPreviousFocusedInput(WrappedComponent) {
    const WithPreviousFocusedInput = forwardRef((props, ref) => (
        <PreviousFocusedInputContext.Consumer>
            {(previousFocusedInputUtils) => (
                <WrappedComponent
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...previousFocusedInputUtils}
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...props}
                    ref={ref}
                />
            )}
        </PreviousFocusedInputContext.Consumer>
    ));

    WithPreviousFocusedInput.displayName = `withPreviousFocusedInput(${getComponentDisplayName(WrappedComponent)})`;

    return WithPreviousFocusedInput;
}

export {withPreviousFocusedInputPropTypes, withPreviousFocusedInputDefaultProps, PreviousFocusedInputContextProvider, PreviousFocusedInputContext};

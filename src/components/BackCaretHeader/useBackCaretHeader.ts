import {useIsFocused} from '@react-navigation/native';
import {useContext, useEffect} from 'react';

import {BackCaretHeaderActionsContext} from './BackCaretHeaderContext';

/**
 * Registers the sticky back caret header configuration for the current screen.
 * The configuration is applied while the screen is focused, so the single
 * StickyBackCaretHeader mounted above the navigator always reflects the focused
 * screen without ever animating with it.
 */
function useBackCaretHeader(shouldShowBackButton: boolean, onBackButtonPress?: () => void) {
    const {setConfig} = useContext(BackCaretHeaderActionsContext);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (!isFocused) {
            return;
        }
        setConfig({shouldShowBackButton, onBackButtonPress});
    }, [isFocused, shouldShowBackButton, onBackButtonPress, setConfig]);
}

export default useBackCaretHeader;

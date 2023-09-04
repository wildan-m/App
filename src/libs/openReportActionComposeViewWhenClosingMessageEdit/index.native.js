import { Keyboard } from 'react-native';
import * as Composer from '../actions/Composer';
import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';

let modal;
Onyx.connect({
    key: ONYXKEYS.MODAL,
    callback: (flag) => (modal = flag),
    initWithStoredValues: {},
});

let keyboardDidHideListener = null;

export default () => {
    if (!keyboardDidHideListener) {
        keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            console.log('[wildebug] keyboardDidHide nhuiashd');
            console.log('[wildebug] modal asdfasdf', modal);

            if (!modal.isVisible) {
                Composer.setShouldShowComposeInput(true);
            }

            keyboardDidHideListener.remove();
            keyboardDidHideListener = null; // Reset the listener reference
        });
    }
};

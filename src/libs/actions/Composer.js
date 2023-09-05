import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';

/**
 * @param {Boolean} shouldShowComposeInput
 */
function setShouldShowComposeInput(shouldShowComposeInput) {
    console.log('[wildebug] setShouldShowComposeInput iajoasdf', shouldShowComposeInput)

    Onyx.set(ONYXKEYS.SHOULD_SHOW_COMPOSE_INPUT, shouldShowComposeInput);
}

export {
    // eslint-disable-next-line import/prefer-default-export
    setShouldShowComposeInput,
};

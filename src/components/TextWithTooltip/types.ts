import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import type {StyleProp, TextStyle} from 'react-native';

type TextWithTooltipProps = ForwardedFSClassProps & {
    /** The text to display */
    text: string;

    /** Whether to show the tooltip text */
    shouldShowTooltip?: boolean;

    /** Additional styles */
    style?: StyleProp<TextStyle>;

    /** Custom number of lines for text wrapping */
    numberOfLines?: number;

    /** Whether the text is a value the user should be able to select and copy */
    isSelectable?: boolean;

    /** TestID of the Text component */
    testID?: string;
};

export default TextWithTooltipProps;

import type {StyleProp, TextStyle} from 'react-native';
import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

type TextWithTooltipProps = ForwardedFSClassProps & {
    /** The text to display */
    text: string;

    /** Whether to show the tooltip text */
    shouldShowTooltip?: boolean;

    /** Whether to always show the tooltip on hover, even when the text is not truncated */
    shouldAlwaysShowTooltip?: boolean;

    /** Additional styles */
    style?: StyleProp<TextStyle>;

    /** Custom number of lines for text wrapping */
    numberOfLines?: number;

    /** TestID of the Text component */
    testID?: string;
};

export default TextWithTooltipProps;

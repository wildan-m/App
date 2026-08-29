import type {ReactNode} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

type HeaderTitleProps = {
    /** Sub-components (HeaderTitle.Text, HeaderTitle.Subtitle, HeaderTitle.SubtitleLink) */
    children?: ReactNode;

    /** Additional styles for the inner wrapper around the title block */
    style?: StyleProp<ViewStyle>;

    /** Additional styles for the outer container */
    containerStyles?: StyleProp<ViewStyle>;
};

export default HeaderTitleProps;

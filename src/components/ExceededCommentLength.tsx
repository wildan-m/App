import React, {memo} from 'react';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import Text from './Text';

type ExceededCommentLengthProps = {
    commentLength: number;
    maxCommentLength?: number;
    isTaskTitle?: boolean;
};

function ExceededCommentLength({commentLength, maxCommentLength = CONST.MAX_COMMENT_LENGTH, isTaskTitle}: ExceededCommentLengthProps) {
    const styles = useThemeStyles();
    const {numberFormat, translate} = useLocalize();

    const translationKey = isTaskTitle ? 'composer.taskTitleExceededMaxLength' : 'composer.commentExceededMaxLength';

    return (
        <Text
            style={[styles.textMicro, styles.textDanger, styles.chatItemComposeSecondaryRow, styles.mlAuto, styles.pl2]}
            numberOfLines={1}
        >
            {translate(translationKey, {formattedLength: numberFormat(commentLength), formattedMaxLength: numberFormat(maxCommentLength)})}
        </Text>
    );
}
ExceededCommentLength.displayName = 'ExceededCommentLength';

export default memo(ExceededCommentLength);

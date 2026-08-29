import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ReactNode} from 'react';

import React from 'react';

type HeaderTitleSubtitleProps = {
    /** The subtitle. A string renders the muted single-line label; any other node is rendered as-is */
    children?: ReactNode;
};

function HeaderTitleSubtitle({children}: HeaderTitleSubtitleProps) {
    const styles = useThemeStyles();

    // Render nothing for an empty subtitle so no empty row shifts the title
    if (!children) {
        return null;
    }

    if (typeof children !== 'string') {
        return children;
    }

    return (
        <Text
            style={[styles.mutedTextLabel, styles.pre]}
            numberOfLines={1}
        >
            {children}
        </Text>
    );
}

export default HeaderTitleSubtitle;
export type {HeaderTitleSubtitleProps};

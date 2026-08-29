import TextLink from '@components/TextLink';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {Linking} from 'react-native';

type HeaderTitleSubtitleLinkProps = {
    /** The URL to display and open when pressed */
    children?: string;
};

function HeaderTitleSubtitleLink({children = ''}: HeaderTitleSubtitleLinkProps) {
    const styles = useThemeStyles();

    if (!children) {
        return null;
    }

    return (
        <TextLink
            onPress={() => {
                Linking.openURL(children);
            }}
            numberOfLines={1}
            style={styles.label}
        >
            {children}
        </TextLink>
    );
}

export default HeaderTitleSubtitleLink;
export type {HeaderTitleSubtitleLinkProps};

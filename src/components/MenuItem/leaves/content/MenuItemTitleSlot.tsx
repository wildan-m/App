import {useMenuItemAccessibilityLabel} from '@components/MenuItem/MenuItemAccessibilityContext';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ReactNode} from 'react';

import React from 'react';
import {View} from 'react-native';

type MenuItemTitleSlotProps = {
    /** Content plain text can't express and that isn't text at all, e.g. a `UserPill` or a row of them */
    children: ReactNode;

    /**
     * What the content says, read after the row's text lines. Required because the row builds its label
     * from strings and can't read one out of an element. Leave it empty only when the row names itself.
     */
    accessibilityLabel: string;
};

/**
 * A free-form block of a `MenuItem.Content`, rendered below the text lines. It replaces the legacy
 * `titleComponent`, for rows such as a task assignee that show a pill where a title would go.
 *
 * Reach for `MenuItem.Title` with an element child instead when the content is still text, since a
 * `View` can't sit inside `Text` on native.
 */
function MenuItemTitleSlot({children, accessibilityLabel}: MenuItemTitleSlotProps) {
    const styles = useThemeStyles();

    useMenuItemAccessibilityLabel('details', accessibilityLabel);

    return <View style={styles.mw100}>{children}</View>;
}

export default MenuItemTitleSlot;
export type {MenuItemTitleSlotProps};

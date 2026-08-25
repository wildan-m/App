import SingleAvatar from '@components/Avatar/layouts/SingleAvatar';
import {AvatarTooltipsProvider} from '@components/Avatar/tooltips/AvatarTooltipContext';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

import type {ListItem, SingleSelectListItemProps} from './types';

import SingleSelectListItem from './SingleSelectListItem';

/**
 * A SingleSelectListItem that prepends an avatar when icons are provided. Used in pickers
 * where options have a visual identity (e.g. domain admin selection).
 */
function SingleSelectWithAvatarListItem<TItem extends ListItem>({item, wrapperStyle, showTooltip, ...props}: SingleSelectListItemProps<TItem>) {
    const styles = useThemeStyles();
    const icon = item.icons?.at(0);

    if (!icon) {
        return (
            <SingleSelectListItem
                {...props}
                item={item}
                wrapperStyle={wrapperStyle}
                showTooltip={showTooltip}
            />
        );
    }

    const avatarElement = (
        <AvatarTooltipsProvider isEnabled={showTooltip}>
            <SingleAvatar
                avatar={icon}
                size={CONST.AVATAR_SIZE.DEFAULT}
                containerStyles={styles.mr3}
            />
        </AvatarTooltipsProvider>
    );

    return (
        <SingleSelectListItem
            {...props}
            item={{...item, leftElement: avatarElement}}
            wrapperStyle={[styles.optionRow, styles.pv0, styles.pv3, styles.w100, wrapperStyle]}
            showTooltip={showTooltip}
        />
    );
}

export default SingleSelectWithAvatarListItem;

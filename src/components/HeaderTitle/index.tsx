/**
 * HeaderTitle – the screen / section title block, built with the composition API.
 *
 * Instead of a flat props list (title, subtitle, subTitleLink, textStyles, …),
 * sub-components are composed as children:
 *
 * @example
 * ```tsx
 * import HeaderTitle from '@components/HeaderTitle';
 *
 * <HeaderTitle containerStyles={styles.alignItemsCenter}>
 *     <HeaderTitle.Text numberOfLines={1}>{title}</HeaderTitle.Text>
 *     <HeaderTitle.Subtitle>{subtitle}</HeaderTitle.Subtitle>
 *     <HeaderTitle.SubtitleLink>{subtitleLink}</HeaderTitle.SubtitleLink>
 * </HeaderTitle>
 * ```
 *
 * The dialog label / focus / announcement wiring for screen headers lives in
 * HeaderWithBackButton, so HeaderTitle is purely presentational.
 */
import React from 'react';

import HeaderTitleComponent from './HeaderTitle';
import HeaderTitleSubtitle from './primitives/HeaderTitleSubtitle';
import HeaderTitleSubtitleLink from './primitives/HeaderTitleSubtitleLink';
import HeaderTitleText from './primitives/HeaderTitleText';

function HeaderTitleBase(props: React.ComponentProps<typeof HeaderTitleComponent>) {
    return <HeaderTitleComponent {...props} />;
}

const HeaderTitle = Object.assign(HeaderTitleBase, {
    Text: HeaderTitleText,
    Subtitle: HeaderTitleSubtitle,
    SubtitleLink: HeaderTitleSubtitleLink,
});

export default HeaderTitle;
export type {default as HeaderTitleProps} from './types';

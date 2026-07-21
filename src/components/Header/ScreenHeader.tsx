import SearchButton from '@components/Search/SearchRouter/SearchButton';
import SidePanelButton from '@components/SidePanel/SidePanelButton';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ReactNode} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';

import HeaderBackButton from './BackButton';
import HeaderRoot from './Root';
import HeaderTitle from './Title';

type ScreenHeaderProps = {
    /** Title of the header */
    title?: string;

    /** Subtitle of the header */
    subtitle?: ReactNode;

    /** Method to trigger when pressing the back button; defaults to Navigation.goBack() */
    onBackButtonPress?: () => void;

    /** Whether to show the back button */
    shouldShowBackButton?: boolean;

    /** Whether to show a border on the bottom of the header */
    shouldShowBorderBottom?: boolean;

    /** Whether to display the button that opens the search router */
    shouldDisplaySearchRouter?: boolean;

    /** Whether to display the button that opens the Help side panel */
    shouldDisplayHelpButton?: boolean;

    /** Whether to skip focus of the first interactive element after the RHP transition */
    shouldSkipFocusAfterTransition?: boolean;

    /** Additional styles for the header bar */
    style?: StyleProp<ViewStyle>;
};

/**
 * Preset covering the most common header shape: back button + title.
 * The default screen header for settings pages, RHP flows, and detail views.
 */
function ScreenHeader({
    title = '',
    subtitle = '',
    onBackButtonPress,
    shouldShowBackButton = true,
    shouldShowBorderBottom = false,
    shouldDisplaySearchRouter = false,
    shouldDisplayHelpButton = false,
    shouldSkipFocusAfterTransition = false,
    style,
}: ScreenHeaderProps) {
    const styles = useThemeStyles();

    return (
        <HeaderRoot
            shouldShowBorderBottom={shouldShowBorderBottom}
            style={[shouldShowBackButton && styles.pl2, style]}
        >
            {shouldShowBackButton && <HeaderBackButton onPress={onBackButtonPress} />}
            <HeaderTitle
                title={title}
                subtitle={subtitle}
                numberOfTitleLines={1}
                isScreenHeader
                shouldSkipFocusAfterTransition={shouldSkipFocusAfterTransition}
            />
            {shouldDisplaySearchRouter && <SearchButton />}
            {shouldDisplayHelpButton && <SidePanelButton />}
        </HeaderRoot>
    );
}

export default ScreenHeader;
export type {ScreenHeaderProps};

import React from 'react';
import OfflineIndicator from '@components/OfflineIndicator';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import ComposerExceededLength from './ComposerExceededLength';
import ComposerFooter from './ComposerFooter';
import ComposerTypingIndicator from './ComposerTypingIndicator';

function ComposerDefaultFooter() {
    const styles = useThemeStyles();
    // We need to use isSmallScreenWidth instead of shouldUseNarrowLayout so the composer's offline indicator is hidden only on
    // small screens (where ScreenWrapper renders its own bottom offline indicator), not in wide-screen RHP threads where it would otherwise go missing.
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {isSmallScreenWidth} = useResponsiveLayout();

    return (
        <ComposerFooter>
            {!isSmallScreenWidth && <OfflineIndicator containerStyles={[styles.chatItemComposeSecondaryRow]} />}
            <ComposerTypingIndicator />
            <ComposerExceededLength />
        </ComposerFooter>
    );
}

export default ComposerDefaultFooter;

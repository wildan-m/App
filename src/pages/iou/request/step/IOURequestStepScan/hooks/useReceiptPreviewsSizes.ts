import useContentHeaderHeight from '@hooks/useContentHeaderHeight';
import useSafeAreaInsets from '@hooks/useSafeAreaInsets';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';

import variables from '@styles/variables';

function useReceiptPreviewsSizes(isInLandscapeMode: boolean) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const insets = useSafeAreaInsets();
    const {windowWidth, windowHeight} = useWindowDimensions();
    const {contentHeaderHeight} = useContentHeaderHeight();

    if (isInLandscapeMode) {
        const previewItemSize = styles.receiptPlaceholderLandscape.height + styles.receiptPlaceholderLandscape.marginBottom;

        const submitButtonHeight = styles.singleAvatarXLarge.height;
        const tabSelectorButtonHeight = variables.tabSelectorButtonHeight + styles.pb4.paddingBottom;
        const initialReceiptsAmount = (windowHeight - submitButtonHeight - tabSelectorButtonHeight - contentHeaderHeight) / previewItemSize;

        return {
            previewsSize: styles.receiptPlaceholderLandscape.width + styles.ph6.paddingHorizontal * 2,
            previewItemSize,
            initialReceiptsAmount,
            bottomInsetPadding: 0,
        };
    }

    // ScreenWrapper applies only part of the bottom inset on iOS, so the bottom-docked previews add the rest to stay above the home indicator
    const bottomInsetPadding = Math.max(insets.bottom - StyleUtils.getPlatformSafeAreaPadding(insets).paddingBottom, 0);

    const previewItemSize = styles.receiptPlaceholder.width + styles.receiptPlaceholder.marginRight;
    const initialReceiptsAmount = (windowWidth - styles.ph4.paddingHorizontal * 2 - styles.singleAvatarXLarge.width) / previewItemSize;

    return {
        previewsSize: styles.receiptPlaceholder.height + styles.pv2.paddingVertical * 2 + bottomInsetPadding,
        previewItemSize,
        initialReceiptsAmount,
        bottomInsetPadding,
    };
}

export default useReceiptPreviewsSizes;

import Icon from '@components/Icon';
import {PressableWithoutFeedback} from '@components/Pressable';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React, {useContext} from 'react';
import {View} from 'react-native';

import {BackCaretHeaderConfigContext} from './BackCaretHeaderContext';

type BackCaretHeaderProps = {
    onBackButtonPress?: () => void;

    shouldShowBackButton?: boolean;
};

/**
 * Popover-style back link: caret + "Back" label.
 * Matches the submenu back row used by PopoverMenu.
 */
function BackCaretHeader({onBackButtonPress, shouldShowBackButton = true}: BackCaretHeaderProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['BackArrow']);

    return (
        <View style={[styles.backCaretHeaderContainer]}>
            {shouldShowBackButton ? (
                <PressableWithoutFeedback
                    onPress={onBackButtonPress}
                    style={[styles.flexRow, styles.alignItemsCenter, styles.gap3]}
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={translate('common.back')}
                    sentryLabel="BackCaretHeader-Back"
                >
                    <Icon
                        src={icons.BackArrow}
                        fill={theme.icon}
                        width={variables.iconSizeNormal}
                        height={variables.iconSizeNormal}
                    />
                    <Text style={styles.createMenuHeaderText}>{translate('common.back')}</Text>
                </PressableWithoutFeedback>
            ) : null}
        </View>
    );
}

/**
 * Sticky variant that renders the configuration registered by the currently focused
 * screen (via useBackCaretHeader). Mount it once, outside the animated screen cards,
 * so the header never participates in screen transitions.
 */
function StickyBackCaretHeader() {
    const config = useContext(BackCaretHeaderConfigContext);

    return (
        <BackCaretHeader
            shouldShowBackButton={config.shouldShowBackButton}
            onBackButtonPress={config.onBackButtonPress}
        />
    );
}

export default BackCaretHeader;
export {StickyBackCaretHeader};

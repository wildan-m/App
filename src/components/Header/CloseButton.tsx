import Icon from '@components/Icon';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import Tooltip from '@components/Tooltip';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';

import React from 'react';

import {useHeaderContext} from './HeaderContext';

type HeaderCloseButtonProps = {
    /** Method to trigger when pressing the close button */
    onPress?: () => void;
};

function HeaderCloseButton({onPress = () => Navigation.dismissModal()}: HeaderCloseButtonProps) {
    const icons = useMemoizedLazyExpensifyIcons(['Close']);
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {iconFill} = useHeaderContext();

    return (
        <Tooltip text={translate('common.close')}>
            <PressableWithoutFeedback
                onPress={onPress}
                style={[styles.touchableButtonImage]}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={translate('common.close')}
                sentryLabel={CONST.SENTRY_LABEL.HEADER.CLOSE_BUTTON}
            >
                <Icon
                    src={icons.Close}
                    fill={iconFill ?? theme.icon}
                />
            </PressableWithoutFeedback>
        </Tooltip>
    );
}

export default HeaderCloseButton;
export type {HeaderCloseButtonProps};

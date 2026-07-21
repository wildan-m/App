import Icon from '@components/Icon';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import Tooltip from '@components/Tooltip';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React from 'react';
import {Keyboard} from 'react-native';

import {useHeaderContext} from './HeaderContext';

type HeaderBackButtonProps = {
    /** Method to trigger when pressing the back button */
    onPress?: () => void;

    /** Whether to navigate to the report page when the route has a topmost report */
    shouldNavigateToTopMostReport?: boolean;
};

function HeaderBackButton({onPress = () => Navigation.goBack(), shouldNavigateToTopMostReport = false}: HeaderBackButtonProps) {
    const icons = useMemoizedLazyExpensifyIcons(['BackArrow']);
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {iconFill} = useHeaderContext();

    return (
        <Tooltip text={translate('common.back')}>
            <PressableWithoutFeedback
                onPress={() => {
                    if (Keyboard.isVisible()) {
                        Keyboard.dismiss();
                    }
                    const topmostReportId = Navigation.getTopmostReportId();
                    if (shouldNavigateToTopMostReport && topmostReportId) {
                        Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(topmostReportId));
                    } else {
                        onPress();
                    }
                }}
                style={[styles.touchableButtonImage]}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={translate('common.back')}
                id={CONST.BACK_BUTTON_NATIVE_ID}
                sentryLabel={CONST.SENTRY_LABEL.HEADER.BACK_BUTTON}
            >
                <Icon
                    src={icons.BackArrow}
                    fill={iconFill ?? theme.icon}
                />
            </PressableWithoutFeedback>
        </Tooltip>
    );
}

export default HeaderBackButton;
export type {HeaderBackButtonProps};

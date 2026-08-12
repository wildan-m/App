import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';

import Permissions from '@libs/Permissions';

import {clearBetaOverrides, setBetaOverride} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type Beta from '@src/types/onyx/Beta';

import React, {useMemo, useState} from 'react';
import {View} from 'react-native';

import Button from './Button';
import Header from './Header';
import Modal from './Modal';
import ScrollView from './ScrollView';
import Switch from './Switch';
import TestToolRow from './TestToolRow';
import Text from './Text';

function BetaOverridesTestToolRow() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {windowHeight} = useWindowDimensions();
    // We need to use isSmallScreenWidth here because the Modal breaks in RHP with shouldUseNarrowLayout.
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {isSmallScreenWidth} = useResponsiveLayout();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [betaConfiguration] = useOnyx(ONYXKEYS.BETA_CONFIGURATION);
    const [betasOverride] = useOnyx(ONYXKEYS.BETAS_OVERRIDE);

    // The 'all' beta is excluded — it is a blanket switch over every beta rather than an individual
    // feature, so overriding it would interact unpredictably with the per-beta switches.
    const betaList = useMemo(
        () =>
            Object.values(CONST.BETAS)
                .filter((beta): beta is Beta => beta !== CONST.BETAS.ALL)
                .sort((first, second) => first.localeCompare(second)),
        [],
    );

    const hasOverrides = Object.keys(betasOverride ?? {}).length > 0;

    return (
        <>
            <TestToolRow title={translate('initialSettingsPage.troubleshoot.betaOverrides')}>
                <Button
                    small
                    text={translate('common.view')}
                    onPress={() => setIsModalVisible(true)}
                />
            </TestToolRow>
            <Modal
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                type={isSmallScreenWidth ? CONST.MODAL.MODAL_TYPE.BOTTOM_DOCKED : CONST.MODAL.MODAL_TYPE.CONFIRM}
            >
                <View style={[styles.p5, {maxHeight: windowHeight * 0.8}]}>
                    <Header title={translate('initialSettingsPage.troubleshoot.betaOverrides')} />
                    <Text style={[styles.textLabelSupporting, styles.mt2, styles.mb3]}>{translate('initialSettingsPage.troubleshoot.betaOverridesDescription')}</Text>
                    <Button
                        small
                        text={translate('initialSettingsPage.troubleshoot.resetAllBetaOverrides')}
                        isDisabled={!hasOverrides}
                        onPress={() => clearBetaOverrides(betas)}
                        style={styles.mb3}
                    />
                    <ScrollView>
                        {betaList.map((beta) => {
                            // Compute the effective state from the subscribed values directly (rather than relying on
                            // Permissions' own override subscription) so the switch reflects a toggle instantly.
                            const override = betasOverride?.[beta];
                            const isEnabled = override ?? Permissions.isBetaEnabled(beta, betas, betaConfiguration);
                            const isOverridden = override !== undefined;
                            return (
                                <TestToolRow
                                    key={beta}
                                    title={isOverridden ? `${beta} (${translate('initialSettingsPage.troubleshoot.overridden')})` : beta}
                                >
                                    <Switch
                                        accessibilityLabel={beta}
                                        isOn={isEnabled}
                                        onToggle={() => setBetaOverride(beta, !isEnabled, betas)}
                                    />
                                </TestToolRow>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
}

BetaOverridesTestToolRow.displayName = 'BetaOverridesTestToolRow';

export default BetaOverridesTestToolRow;

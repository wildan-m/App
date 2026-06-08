import React, {useState} from 'react';
import {View} from 'react-native';
import {ChartFontsProvider} from '@components/Charts/hooks';
import useChartFonts from '@components/Charts/hooks/useChartFonts';
import Modal from '@components/Modal';
import IconButton from '@components/VideoPlayer/IconButton';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Log from '@libs/Log';
import CONST from '@src/CONST';
import VictoryChartContainer from './components/VictoryChartContainer';
import VictoryChartContent from './components/VictoryChartContent';
import {VictoryChartProvider} from './context/VictoryChartContext';
import processVictoryChartTree from './parsers/processVictoryChartTree';
import type {VictoryChartRendererProps} from './types';
import resolveVictoryChartType from './utils/resolveVictoryChartType';

function BaseVictoryChartRenderer({tnode}: VictoryChartRendererProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Expand']);
    const fonts = useChartFonts();
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    let processedResult;
    try {
        processedResult = processVictoryChartTree(tnode, fonts.typefaces.EXP_NEUE, null);
    } catch (error) {
        // Malformed chart HTML can make a parser throw. Fail closed (render nothing) instead of crashing the whole report.
        Log.warn('[VictoryChartRenderer] Failed to process chart tree from malformed HTML', {error});
        return null;
    }

    const type = resolveVictoryChartType(processedResult.data);
    if (!type) {
        Log.warn('Trying to render an invalid chart (empty or mixed chart types).');
        return null;
    }

    return (
        <ChartFontsProvider value={fonts}>
            <VictoryChartProvider
                tnode={tnode}
                processedResult={processedResult}
                type={type}
            >
                <View>
                    <VictoryChartContainer>
                        <VictoryChartContent />
                    </VictoryChartContainer>
                    {/* The expand button sits on top of the chart's top-right corner and captures pointer events,
                        suppressing any chart gesture layer underneath it in that corner. */}
                    <IconButton
                        src={icons.Expand}
                        style={styles.chartExpandButton}
                        tooltipText={translate('common.expand')}
                        onPress={() => setIsFullScreenVisible(true)}
                        small
                    />
                </View>
                <Modal
                    isVisible={isFullScreenVisible}
                    type={CONST.MODAL.MODAL_TYPE.CENTERED_UNSWIPEABLE}
                    onClose={() => setIsFullScreenVisible(false)}
                >
                    <View style={styles.chartFullScreenContent}>
                        <VictoryChartContainer>
                            <VictoryChartContent />
                        </VictoryChartContainer>
                    </View>
                </Modal>
            </VictoryChartProvider>
        </ChartFontsProvider>
    );
}

export default BaseVictoryChartRenderer;

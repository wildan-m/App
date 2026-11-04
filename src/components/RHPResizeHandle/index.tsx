import useSingleRHPWidth from '@hooks/useSingleRHPWidth';
import useThemeStyles from '@hooks/useThemeStyles';

import {resetSingleRHPWidth, setSingleRHPWidth} from '@libs/actions/SingleRHPWidth';
import {clearLiveSingleRHPWidth, writeLiveSingleRHPWidth} from '@libs/Navigation/helpers/singleRHPWidth';

import variables from '@styles/variables';

import React from 'react';

import PaneResizeHandle from './PaneResizeHandle';

/**
 * Drags the single RHP card's left edge. A sibling of the card rather than a child, because the card clips its overflow,
 * and rendered after the overlay so it wins hit-testing over the scrim that closes the RHP.
 */
function RHPResizeHandle() {
    const styles = useThemeStyles();
    const {width, min, max} = useSingleRHPWidth();

    return (
        <PaneResizeHandle
            width={width}
            min={min}
            max={max}
            defaultWidth={variables.rhpWidth}
            style={styles.rhpResizeHandle(width)}
            writeLiveWidth={writeLiveSingleRHPWidth}
            clearLiveWidth={clearLiveSingleRHPWidth}
            saveWidth={setSingleRHPWidth}
            resetWidth={resetSingleRHPWidth}
        />
    );
}

export default RHPResizeHandle;

import PaneResizeHandle from '@components/RHPResizeHandle/PaneResizeHandle';

import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useSidePanelState from '@hooks/useSidePanelState';
import useThemeStyles from '@hooks/useThemeStyles';

import {resetSidePanelWidth, setSidePanelWidth} from '@libs/actions/SidePanelWidth';
import {clearLiveSidePanelWidth, writeLiveSidePanelWidth} from '@libs/Navigation/helpers/sidePanelWidth';

import variables from '@styles/variables';

import React from 'react';

/** Drags the side panel's left edge, with the same handle the single RHP uses. */
function SidePanelResizeHandle() {
    const styles = useThemeStyles();
    const {isExtraLargeScreenWidth} = useResponsiveLayout();
    const {sidePanelWidth, sidePanelMinWidth, sidePanelMaxWidth, sidePanelOffset} = useSidePanelState();

    const writeLiveWidth = (width: number) => {
        writeLiveSidePanelWidth(width);

        // A docked panel reserves its width beside the page, so the page follows the drag. A panel over the page leaves it alone.
        if (isExtraLargeScreenWidth) {
            sidePanelOffset.current.setValue(width);
        }
    };

    return (
        <PaneResizeHandle
            width={sidePanelWidth}
            min={sidePanelMinWidth}
            max={sidePanelMaxWidth}
            defaultWidth={variables.sidePanelWidth}
            style={styles.sidePanelResizeHandle(sidePanelWidth)}
            writeLiveWidth={writeLiveWidth}
            clearLiveWidth={clearLiveSidePanelWidth}
            saveWidth={setSidePanelWidth}
            resetWidth={resetSidePanelWidth}
        />
    );
}

export default SidePanelResizeHandle;

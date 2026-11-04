/** The side panel's committed width on a wide layout, clamped to the bounds the window allows. */
import getSidePanelWidthBounds from '@libs/Navigation/helpers/sidePanelWidth/getSidePanelWidthBounds';
import type {SidePanelWidthBounds} from '@libs/Navigation/helpers/sidePanelWidth/getSidePanelWidthBounds';

import variables from '@styles/variables';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import lodashClamp from 'lodash/clamp';

import useOnyx from './useOnyx';
import usePermissions from './usePermissions';
import useResponsiveLayout from './useResponsiveLayout';
import useWindowDimensions from './useWindowDimensions';

type ResizableSidePanelWidth = SidePanelWidthBounds & {
    width: number;

    /** Rolled out with the resizable RHP, so both panels behave the same way. Narrow layouts keep the full-screen panel. */
    isResizable: boolean;
};

/** Clamped at render rather than when saved, so a window that shrinks, or a wide RHP that opens, returns to the dragged width afterwards. */
function useResizableSidePanelWidth(isWideRHPOpen: boolean): ResizableSidePanelWidth {
    const [storedWidth] = useOnyx(ONYXKEYS.SIDE_PANEL_WIDTH);
    const {isBetaEnabled} = usePermissions();
    const {windowWidth} = useWindowDimensions();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const {min, max} = getSidePanelWidthBounds(windowWidth, isWideRHPOpen);
    const isResizable = isBetaEnabled(CONST.BETAS.RESIZABLE_RHP) && !shouldUseNarrowLayout;

    // The beta can turn off without a chance to clear the saved width, and there is no handle to drag it back then.
    if (!isResizable) {
        return {width: variables.sidePanelWidth, min, max, isResizable};
    }

    return {width: lodashClamp(storedWidth ?? variables.sidePanelWidth, min, max), min, max, isResizable};
}

export default useResizableSidePanelWidth;

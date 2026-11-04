/** How narrow and how wide the side panel can be dragged in a given window. */
import calculateWideRHPWidth from '@libs/Navigation/helpers/calculateWideRHPWidth';
import RHP_FLOATING_CARD_INSET from '@libs/Navigation/helpers/rhpFloatingCardInset';
import getSingleRHPWidthBounds from '@libs/Navigation/helpers/singleRHPWidth/getSingleRHPWidthBounds';

import variables from '@styles/variables';

type SidePanelWidthBounds = {
    min: number;
    max: number;
};

/** Never narrower than the default, never wider than the single RHP can be dragged, and, while a wide RHP is open, narrow enough to keep it on screen. */
function getSidePanelWidthBounds(windowWidth: number, isWideRHPOpen: boolean): SidePanelWidthBounds {
    const min = variables.sidePanelWidth;
    const rhpMaxWidth = getSingleRHPWidthBounds(windowWidth, 0).max;
    const widthBesideWideRHP = isWideRHPOpen ? windowWidth - calculateWideRHPWidth(windowWidth) - RHP_FLOATING_CARD_INSET : Infinity;

    return {min, max: Math.max(min, Math.min(rhpMaxWidth, widthBesideWideRHP))};
}

export default getSidePanelWidthBounds;
export type {SidePanelWidthBounds};

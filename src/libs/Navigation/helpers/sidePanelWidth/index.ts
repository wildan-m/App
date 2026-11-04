/** The side panel width a drag paints straight onto the DOM, ahead of React, as a CSS variable that styles fall back from. */
import type {DimensionValue} from 'react-native';

const SIDE_PANEL_WIDTH_VARIABLE = '--side-panel-width';

function writeLiveSidePanelWidth(width: number) {
    document.documentElement.style.setProperty(SIDE_PANEL_WIDTH_VARIABLE, `${width}px`);
}

function clearLiveSidePanelWidth() {
    document.documentElement.style.removeProperty(SIDE_PANEL_WIDTH_VARIABLE);
}

/** The live width mid-drag, the committed `width` otherwise. */
function getSidePanelWidthStyleValue(width: number, offset = 0): DimensionValue {
    // DimensionValue has no member for CSS functions, which react-native-web still renders as written.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return `calc(var(${SIDE_PANEL_WIDTH_VARIABLE}, ${width}px) + ${offset}px)` as DimensionValue;
}

export {clearLiveSidePanelWidth, getSidePanelWidthStyleValue, writeLiveSidePanelWidth};

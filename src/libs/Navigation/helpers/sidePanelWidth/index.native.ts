import type {DimensionValue} from 'react-native';

/** The side panel is full-screen on native, so nothing drags its width. */
function writeLiveSidePanelWidth() {}

function clearLiveSidePanelWidth() {}

function getSidePanelWidthStyleValue(width: number, offset = 0): DimensionValue {
    return width + offset;
}

export {clearLiveSidePanelWidth, getSidePanelWidthStyleValue, writeLiveSidePanelWidth};

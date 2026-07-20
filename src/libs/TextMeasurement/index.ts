import FontUtils from '@styles/utils/FontUtils';

import type MeasureTextWidth from './types';

// Fallback ratio when a canvas 2D context can't be created (e.g. jsdom in tests)
const APPROXIMATE_CHAR_WIDTH_RATIO = 0.55;

let canvasContext: CanvasRenderingContext2D | null | undefined;

function getCanvasContext(): CanvasRenderingContext2D | null {
    if (canvasContext === undefined) {
        canvasContext = document.createElement('canvas').getContext('2d');
    }
    return canvasContext;
}

// Family names must be individually quoted for the canvas font shorthand — an invalid
// font string is silently ignored, which would leave measurements at the default 10px font.
const fontFamilies = FontUtils.fontFamily.platform.EXP_NEUE.fontFamily
    .split(',')
    .map((family) => `"${family.trim()}"`)
    .join(', ');

const measureTextWidth: MeasureTextWidth = (text, fontSize) => {
    const context = getCanvasContext();
    if (!context) {
        return text.length * fontSize * APPROXIMATE_CHAR_WIDTH_RATIO;
    }
    context.font = `${FontUtils.fontFamily.platform.EXP_NEUE.fontWeight} ${fontSize}px ${fontFamilies}`;
    return context.measureText(text).width;
};

export default measureTextWidth;

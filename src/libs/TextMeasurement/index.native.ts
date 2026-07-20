import type MeasureTextWidth from './types';

// The wide (grid) table layout never renders on native — narrow layout takes over — so an
// average-glyph-width approximation is sufficient and avoids any native measurement round-trip.
const APPROXIMATE_CHAR_WIDTH_RATIO = 0.55;

const measureTextWidth: MeasureTextWidth = (text, fontSize) => text.length * fontSize * APPROXIMATE_CHAR_WIDTH_RATIO;

export default measureTextWidth;

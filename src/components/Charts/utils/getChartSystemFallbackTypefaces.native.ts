import type {ChartDefaultTypeface} from '@components/Charts/types/chartSkiaTypefaceTypes';

import type {SkTypeface} from '@shopify/react-native-skia';

import {FontStyle, Skia} from '@shopify/react-native-skia';
import {Platform} from 'react-native';

import hasAnyLoadedChartTypeface from './hasAnyLoadedChartTypeface';

const SANS_SERIF_FAMILY = Platform.select({ios: 'Helvetica', default: 'sans-serif'});
const MONOSPACE_FAMILY = Platform.select({ios: 'Menlo', default: 'monospace'});

/**
 * System typefaces used when none of the bundled chart fonts could be loaded, so chart text still renders
 * (in the system font) instead of disappearing.
 */
function getChartSystemFallbackTypefaces(): ChartDefaultTypeface | null {
    const systemFontManager = Skia.FontMgr.System();
    const matchSystemTypeface = (familyName: string, fontStyle: FontStyle): SkTypeface | null => systemFontManager.matchFamilyStyle(familyName, fontStyle);

    const typefaces: ChartDefaultTypeface = {
        MONOSPACE: matchSystemTypeface(MONOSPACE_FAMILY, FontStyle.Normal),
        MONOSPACE_BOLD: matchSystemTypeface(MONOSPACE_FAMILY, FontStyle.Bold),
        MONOSPACE_ITALIC: matchSystemTypeface(MONOSPACE_FAMILY, FontStyle.Italic),
        MONOSPACE_BOLD_ITALIC: matchSystemTypeface(MONOSPACE_FAMILY, FontStyle.BoldItalic),
        EXP_NEUE: matchSystemTypeface(SANS_SERIF_FAMILY, FontStyle.Normal),
        EXP_NEUE_BOLD: matchSystemTypeface(SANS_SERIF_FAMILY, FontStyle.Bold),
        EXP_NEUE_ITALIC: matchSystemTypeface(SANS_SERIF_FAMILY, FontStyle.Italic),
        EXP_NEUE_BOLD_ITALIC: matchSystemTypeface(SANS_SERIF_FAMILY, FontStyle.BoldItalic),
        EXP_NEW_KANSAS_MEDIUM: matchSystemTypeface(SANS_SERIF_FAMILY, FontStyle.Bold),
        EXP_NEW_KANSAS_MEDIUM_ITALIC: matchSystemTypeface(SANS_SERIF_FAMILY, FontStyle.BoldItalic),
        CUSTOM_EMOJI_FONT: null,
    };

    return hasAnyLoadedChartTypeface(typefaces) ? typefaces : null;
}

export default getChartSystemFallbackTypefaces;

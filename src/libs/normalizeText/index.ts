import CONST from '@src/CONST';
import type NormalizeText from './types';

/**
 * Web and Desktop only
 */

const normalizeText: NormalizeText = (fontSizeValue: number) =>
{
    return {
        fontSize: fontSizeValue * 4,
        transform: [{scale: 0.25}],
    };
};

export default normalizeText;

import type {DataModule} from '@shopify/react-native-skia';

import {Asset} from 'expo-asset';

const ANDROID_FONT_RESOURCE_BASE_URI = 'file:///android_res/font/';

/**
 * In Android release builds the bundler places font assets in `res/font`, and the asset URI resolves to a bare
 * resource name. `Skia.Data.fromURI` only looks up bare names in `res/drawable` and `res/raw`, so the load fails
 * and every chart label renders without a typeface. Copy the font resource to a local file and hand Skia that
 * `file://` URI instead. Debug builds resolve to a dev server URL, which Skia can already fetch.
 */
async function getSkiaReadableChartFontUri(source: DataModule | string, uri: string): Promise<string> {
    if (typeof source !== 'number' || uri.includes(':')) {
        return uri;
    }

    const {type} = Asset.fromModule(source);
    const fontResource = await Asset.fromURI(`${ANDROID_FONT_RESOURCE_BASE_URI}${uri}.${type}`).downloadAsync();

    if (!fontResource.localUri) {
        throw new Error(`Chart font resource ${uri} could not be copied to a local file`);
    }

    return fontResource.localUri;
}

export default getSkiaReadableChartFontUri;

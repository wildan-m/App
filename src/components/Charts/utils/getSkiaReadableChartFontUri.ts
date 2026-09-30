import type {DataModule} from '@shopify/react-native-skia';

/**
 * On web and iOS the resolved chart font URI can be read by `Skia.Data.fromURI` as is.
 */
function getSkiaReadableChartFontUri(source: DataModule | string, uri: string): Promise<string> {
    return Promise.resolve(uri);
}

export default getSkiaReadableChartFontUri;

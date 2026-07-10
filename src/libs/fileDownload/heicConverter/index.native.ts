import {verifyFileFormat} from '@libs/fileDownload/FileUtils';
import Log from '@libs/Log';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import {ImageManipulator, SaveFormat} from 'expo-image-manipulator';

import type {HeicConverterFunction} from './types';

/**
 * Helper function to convert HEIC/HEIF image to JPEG using ImageManipulator
 * @param file - The original file object
 * @param sourceUri - URI of the image to convert
 * @param originalExtension - The original file extension pattern to replace
 * @param callbacks - Callback functions for the conversion process
 */
const convertImageWithManipulator = (
    file: FileObject,
    sourceUri: string,
    originalExtension: RegExp,
    {
        onSuccess = () => {},
        onError = () => {},
        onFinish = () => {},
    }: {
        onSuccess?: (convertedFile: FileObject) => void;
        onError?: (error: unknown, originalFile: FileObject) => void;
        onFinish?: () => void;
    } = {},
) => {
    // Each attempt builds its own ImageManipulator context. `Image context has been lost` is a
    // transient, per-context failure under memory pressure, so a fresh context is required to retry.
    const renderAndSave = () =>
        ImageManipulator.manipulate(sourceUri)
            .renderAsync()
            .then((manipulatedImage) => manipulatedImage.saveAsync({format: SaveFormat.JPEG}));

    renderAndSave()
        .catch((err) => {
            // Retry exactly once with a fresh context before reporting failure — this is why the
            // issue's "retry the upload" workaround succeeds. A genuinely corrupt file still fails fast.
            Log.warn('HEIC/HEIF conversion failed, retrying once', {error: err instanceof Error ? err.message : String(err)});
            return renderAndSave();
        })
        .then((manipulationResult) => {
            const convertedFile = {
                uri: manipulationResult.uri,
                name: file.name?.replace(originalExtension, '.jpg') ?? 'converted-image.jpg',
                type: 'image/jpeg',
                size: file.size,
                width: manipulationResult.width,
                height: manipulationResult.height,
            };
            onSuccess(convertedFile);
        })
        .catch((err) => {
            Log.warn('Error converting HEIC/HEIF to JPEG', {error: err instanceof Error ? err.message : String(err)});
            onError(err, file);
        })
        .finally(() => {
            onFinish();
        });
};

/**
 * Native implementation for converting HEIC/HEIF images to JPEG
 * @param file - The file to check and potentially convert
 * @param callbacks - Object containing callback functions for different stages of conversion
 */
const convertHeicImage: HeicConverterFunction = (file, {onSuccess = () => {}, onError = () => {}, onStart = () => {}, onFinish = () => {}} = {}) => {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const needsConversion = file.name?.toLowerCase().endsWith('.heic') || file.name?.toLowerCase().endsWith('.heif');

    if (!needsConversion || !file.uri || !file.type?.startsWith('image')) {
        onSuccess(file);
        return;
    }

    onStart();

    if (!file.uri) {
        onError(new Error('File URI is undefined'), file);
        onFinish();
        return;
    }

    // Conversion based on extension
    if (needsConversion) {
        const fileUri = file.uri;
        convertImageWithManipulator(file, fileUri, /\.(heic|heif)$/i, {
            onSuccess,
            onError,
            onFinish,
        });
        return;
    }

    // If not detected by extension, check using file signatures
    verifyFileFormat({fileUri: file.uri, formatSignatures: CONST.HEIC_SIGNATURES})
        .then((isHEIC) => {
            if (isHEIC) {
                const fileUri = file.uri;
                if (!fileUri) {
                    onError(new Error('File URI is undefined'), file);
                    onFinish();
                    return;
                }
                convertImageWithManipulator(file, fileUri, /\.heic$/i, {
                    onSuccess,
                    onError,
                    onFinish,
                });
                return;
            }

            onSuccess(file);
        })
        .catch((err) => {
            Log.warn('Error processing the file', {error: err instanceof Error ? err.message : String(err)});
            onError(err, file);
        })
        .finally(() => {
            onFinish();
        });
};

export default convertHeicImage;

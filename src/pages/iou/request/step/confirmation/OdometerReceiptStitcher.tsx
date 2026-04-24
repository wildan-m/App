import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import useLocalize from '@hooks/useLocalize';
import Log from '@libs/Log';
import {getOdometerImageName, getOdometerImageType, getOdometerImageUri} from '@libs/OdometerImageUtils';
import stitchOdometerImages from '@libs/stitchOdometerImages';
import {cancelSpan, endSpan, startSpan} from '@libs/telemetry/activeSpans';
import {setMoneyRequestReceipt} from '@userActions/IOU/Receipt';
import CONST from '@src/CONST';
import type {Transaction} from '@src/types/onyx';
import type {FileObject} from '@src/types/utils/Attachment';

type OdometerReceiptStitcherProps = {
    isOdometerDistanceRequest: boolean;
    odometerStartImage: FileObject | string | null | undefined;
    odometerEndImage: FileObject | string | null | undefined;
    transaction: OnyxEntry<Transaction>;
    onStitchingChange: (isStitching: boolean) => void;
    onStitchError: (error: string) => void;
};

/**
 * Side-effect-only component that stitches two odometer images into a single
 * receipt, or sets a single odometer image as the receipt when only one exists.
 * Skips stitching when source images haven't changed (compares by URI, not reference,
 * because Onyx may create new object instances when restoring a backup transaction).
 */
function OdometerReceiptStitcher({isOdometerDistanceRequest, odometerStartImage, odometerEndImage, transaction, onStitchingChange, onStitchError}: OdometerReceiptStitcherProps) {
    const {translate} = useLocalize();
    const isFocused = useIsFocused();
    const lastStitchedImages = useRef<{
        startImage: FileObject | string | null | undefined;
        endImage: FileObject | string | null | undefined;
    } | null>(null);

    useEffect(() => {
        if (!isOdometerDistanceRequest || !isFocused || !transaction) {
            return;
        }

        // Skip stitching when source images haven't changed (compare by URI not reference
        // because Onyx may create new object instances when restoring a backup transaction)
        const startUri = getOdometerImageUri(odometerStartImage);
        const endUri = getOdometerImageUri(odometerEndImage);
        if (
            lastStitchedImages.current !== null &&
            getOdometerImageUri(lastStitchedImages.current.startImage) === startUri &&
            getOdometerImageUri(lastStitchedImages.current.endImage) === endUri
        ) {
            return;
        }

        if (!odometerStartImage || !odometerEndImage) {
            const singleImage = odometerStartImage ?? odometerEndImage;

            if (!singleImage) {
                return;
            }

            setMoneyRequestReceipt(transaction.transactionID, getOdometerImageUri(singleImage), getOdometerImageName(singleImage), true, getOdometerImageType(singleImage));
            lastStitchedImages.current = {startImage: odometerStartImage, endImage: odometerEndImage};
            return;
        }

        let ignore = false;
        onStitchingChange(true);
        onStitchError('');

        startSpan(CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH, {
            name: CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH,
            op: CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH,
        });

        // Blob-URL expiry (after a browser refresh) is handled by useRestartOnOdometerImagesFailure
        // on the same mount. If images are gone, it will clear the draft and navigate; this effect's
        // cleanup then fires (ignore=true, onStitchingChange(false)), so a failed stitch here is
        // benign and does not need to trigger its own navigation.
        stitchOdometerImages(odometerStartImage, odometerEndImage)
            .then((stitchedImage) => {
                if (ignore || !stitchedImage) {
                    cancelSpan(CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH);
                    return;
                }
                setMoneyRequestReceipt(transaction.transactionID, getOdometerImageUri(stitchedImage), getOdometerImageName(stitchedImage), true, getOdometerImageType(stitchedImage));
                lastStitchedImages.current = {startImage: odometerStartImage, endImage: odometerEndImage};
                endSpan(CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH);
            })
            .catch((error: unknown) => {
                cancelSpan(CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH);
                if (ignore) {
                    return;
                }
                Log.warn('stitchOdometerImages failed', {error});
                onStitchError(translate('iou.error.stitchOdometerImagesFailed'));
            })
            .finally(() => {
                if (ignore) {
                    return;
                }
                onStitchingChange(false);
            });

        return () => {
            ignore = true;
            onStitchingChange(false);
            cancelSpan(CONST.TELEMETRY.SPAN_ODOMETER_IMAGE_STITCH);
        };
    }, [isOdometerDistanceRequest, isFocused, odometerStartImage, odometerEndImage, transaction, translate, onStitchingChange, onStitchError]);

    return null;
}

OdometerReceiptStitcher.displayName = 'OdometerReceiptStitcher';

export default OdometerReceiptStitcher;

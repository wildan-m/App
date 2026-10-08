import FeatureTraining from '@components/FeatureTraining';
import FeatureTrainingModal from '@components/FeatureTrainingModal';
import type {ModalProps} from '@components/Modal/Global/ModalContext';
import {ModalActions} from '@components/Modal/Global/ModalContext';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import React, {useRef} from 'react';

/**
 * Educational modal for multi-scan, shown through the global modal stack.
 * Resolves with CONFIRM when the user presses the confirm button, and with CLOSE when it is dismissed any other way
 * (backdrop, Escape, Back). The stack entry is only removed once the close animation has finished.
 */
function MultiScanEducationalModal({closeModal}: ModalProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const lazyIllustrations = useMemoizedLazyIllustrations(['MultiScan']);
    const isConfirmedRef = useRef(false);

    return (
        <FeatureTrainingModal
            modalInnerContainerStyle={styles.pt0}
            onConfirm={() => {
                isConfirmedRef.current = true;
            }}
            onClose={() => closeModal({action: isConfirmedRef.current ? ModalActions.CONFIRM : ModalActions.CLOSE})}
        >
            <FeatureTraining.Illustration
                image={lazyIllustrations.MultiScan}
                imageHeight={220}
                outerContainerStyle={styles.multiScanEducationalPopupImage}
            />
            <FeatureTraining.Body>
                <FeatureTraining.BodyText style={styles.mb6}>
                    <FeatureTraining.Title style={styles.mb2}>{translate('iou.scanMultipleReceipts')}</FeatureTraining.Title>
                    <FeatureTraining.Description>{translate('iou.scanMultipleReceiptsDescription')}</FeatureTraining.Description>
                </FeatureTraining.BodyText>
                <FeatureTraining.ConfirmButton>{translate('common.buttonConfirm')}</FeatureTraining.ConfirmButton>
            </FeatureTraining.Body>
        </FeatureTrainingModal>
    );
}

export default MultiScanEducationalModal;

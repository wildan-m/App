import ReportPDFDownloadModal from '@components/ReportPDFDownloadModal';

import React, {useState} from 'react';

import type {ModalProps} from './ModalContext';

import {ModalActions} from './ModalContext';

type ReportPDFDownloadModalWrapperProps = ModalProps & {
    reportID: string;

    /** Called when the modal is dismissed while the PDF is still generating (e.g. Submit via PDF retracts the submit). */
    onCancel?: () => void;
};

function ReportPDFDownloadModalWrapper({closeModal, reportID, onCancel}: ReportPDFDownloadModalWrapperProps) {
    const [isVisible, setIsVisible] = useState(true);

    return (
        <ReportPDFDownloadModal
            reportID={reportID}
            isVisible={isVisible}
            onClose={() => setIsVisible(false)}
            onCancel={onCancel}
            onModalHide={() => {
                if (isVisible) {
                    return;
                }
                closeModal({action: ModalActions.CLOSE});
            }}
        />
    );
}

export default ReportPDFDownloadModalWrapper;
export type {ReportPDFDownloadModalWrapperProps};

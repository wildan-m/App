import type {ExpensifyCardStatementPDFDownloadModalWrapperProps} from '@components/Modal/Global/ExpensifyCardStatementPDFDownloadModalWrapper';
import ExpensifyCardStatementPDFDownloadModalWrapper from '@components/Modal/Global/ExpensifyCardStatementPDFDownloadModalWrapper';
import type {ModalProps} from '@components/Modal/Global/ModalContext';
import {useModal} from '@components/Modal/Global/ModalContext';

type ExpensifyCardStatementPDFDownloadModalOptions = Omit<ExpensifyCardStatementPDFDownloadModalWrapperProps, keyof ModalProps>;

const useExpensifyCardStatementPDFDownloadModal = () => {
    const context = useModal();

    // Showing again with the same id updates the open modal's props in place, which is how the statement key that the
    // server returns after the modal opens reaches it.
    const showExpensifyCardStatementPDFDownloadModal = (id: string, options: ExpensifyCardStatementPDFDownloadModalOptions) => {
        return context.showModal({
            component: ExpensifyCardStatementPDFDownloadModalWrapper,
            props: options,
            id,
        });
    };

    const closeExpensifyCardStatementPDFDownloadModal = (id: string) => {
        context.closeModalByID(id);
    };

    return {showExpensifyCardStatementPDFDownloadModal, closeExpensifyCardStatementPDFDownloadModal};
};

export default useExpensifyCardStatementPDFDownloadModal;

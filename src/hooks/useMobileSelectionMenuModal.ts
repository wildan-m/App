import type {MobileSelectionMenuModalWrapperProps} from '@components/Modal/Global/MobileSelectionMenuModalWrapper';
import MobileSelectionMenuModalWrapper from '@components/Modal/Global/MobileSelectionMenuModalWrapper';
import type {ModalProps} from '@components/Modal/Global/ModalContext';
import {useModal} from '@components/Modal/Global/ModalContext';

type MobileSelectionMenuOptions = Omit<MobileSelectionMenuModalWrapperProps, keyof ModalProps> & {
    /** Fixed stack ID, so a repeated long press updates the open menu instead of stacking a second one */
    id?: string;
};

/**
 * Opens the narrow-layout long-press "Select" menu on the global modal stack.
 */
const useMobileSelectionMenuModal = () => {
    const context = useModal();

    const showMobileSelectionMenu = ({id, ...options}: MobileSelectionMenuOptions) => {
        return context.showModal({
            component: MobileSelectionMenuModalWrapper,
            props: options,
            id,
        });
    };

    return {showMobileSelectionMenu, closeModalByID: (id: string) => context.closeModalByID(id)};
};

export default useMobileSelectionMenuModal;

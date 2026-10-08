import MenuItemAction from '@components/MenuItem/presets/MenuItemAction';

import useBottomSafeSafeAreaPaddingStyle from '@hooks/useBottomSafeSafeAreaPaddingStyle';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';

import React, {useState} from 'react';
import {View} from 'react-native';

import type {ModalProps} from './ModalContext';

import Modal from '..';
import {ModalActions} from './ModalContext';

type MobileSelectionMenuModalWrapperProps = ModalProps & {
    /** Sentry label for the "Select" menu item */
    sentryLabel?: string;
};

/**
 * The bottom-docked "Select" menu a narrow-layout long press opens on a selectable row. It resolves with `CONFIRM` once
 * it has closed after "Select" was pressed, and with `CLOSE` when it was dismissed, so the caller turns on selection
 * mode and selects the long-pressed row itself.
 */
function MobileSelectionMenuModalWrapper({closeModal, sentryLabel}: MobileSelectionMenuModalWrapperProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isSelectPressed, setIsSelectPressed] = useState(false);
    const {translate} = useLocalize();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['CheckSquare']);
    const bottomSafeAreaPaddingStyle = useBottomSafeSafeAreaPaddingStyle({addBottomSafeAreaPadding: true, addOfflineIndicatorBottomSafeAreaPadding: false});

    return (
        <Modal
            isVisible={isVisible}
            type={CONST.MODAL.MODAL_TYPE.BOTTOM_DOCKED}
            onClose={() => setIsVisible(false)}
            onModalHide={() => {
                if (isVisible) {
                    return;
                }
                closeModal({action: isSelectPressed ? ModalActions.CONFIRM : ModalActions.CLOSE});
            }}
            shouldPreventScrollOnFocus
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <View style={bottomSafeAreaPaddingStyle}>
                <MenuItemAction
                    title={translate('common.select')}
                    icon={expensifyIcons.CheckSquare}
                    onPress={() => {
                        setIsSelectPressed(true);
                        setIsVisible(false);
                    }}
                    sentryLabel={sentryLabel}
                />
            </View>
        </Modal>
    );
}

export default MobileSelectionMenuModalWrapper;
export type {MobileSelectionMenuModalWrapperProps};

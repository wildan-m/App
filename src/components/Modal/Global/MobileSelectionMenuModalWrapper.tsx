import MenuItemAction from '@components/MenuItem/presets/MenuItemAction';

import useBottomSafeSafeAreaPaddingStyle from '@hooks/useBottomSafeSafeAreaPaddingStyle';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {turnOnMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import getPlatform from '@libs/getPlatform';
import {acquireBackgroundInputFocusSuppression} from '@libs/ModalFocusManager';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import type {ModalProps} from './ModalContext';

import Modal from '..';
import {ModalActions} from './ModalContext';

type MobileSelectionMenuModalWrapperProps = ModalProps & {
    /** Called when "Select" is pressed, after mobile selection mode has been turned on. Selects the long-pressed item. */
    onSelect: () => void;

    /** Sentry label for the "Select" menu item */
    sentryLabel?: string;

    /** Test ID for the "Select" menu item */
    testID?: string;

    /**
     * Whether pressing "Select" on iOS should keep focus from going back to a background input (e.g. a table's search
     * field) while the menu closes, so the keyboard does not open over the rows the user is about to select.
     */
    shouldSuppressBackgroundFocusOnSelect?: boolean;
};

/**
 * The bottom-docked "Select" menu a narrow-layout long press opens on a selectable row. Its single action turns on
 * mobile selection mode and selects the row the menu was opened for.
 */
function MobileSelectionMenuModalWrapper({closeModal, onSelect, sentryLabel, testID, shouldSuppressBackgroundFocusOnSelect = false}: MobileSelectionMenuModalWrapperProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shouldSkipFocusRestore, setShouldSkipFocusRestore] = useState(false);
    const releaseBackgroundInputFocusSuppressionRef = useRef<(() => void) | null>(null);
    const {translate} = useLocalize();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['CheckSquare']);
    const [isMobileSelectionModeEnabled = false] = useOnyx(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE);
    const bottomSafeAreaPaddingStyle = useBottomSafeSafeAreaPaddingStyle({addBottomSafeAreaPadding: true, addOfflineIndicatorBottomSafeAreaPadding: false});

    const releaseBackgroundInputFocusSuppression = () => {
        releaseBackgroundInputFocusSuppressionRef.current?.();
        releaseBackgroundInputFocusSuppressionRef.current = null;
    };

    const handleSelectPress = () => {
        if (isSubmitting) {
            return;
        }

        const shouldSuppressFocusRestore = shouldSuppressBackgroundFocusOnSelect && getPlatform() === CONST.PLATFORM.IOS;
        if (shouldSuppressFocusRestore && !releaseBackgroundInputFocusSuppressionRef.current) {
            releaseBackgroundInputFocusSuppressionRef.current = acquireBackgroundInputFocusSuppression();
        }
        setShouldSkipFocusRestore(shouldSuppressFocusRestore);
        setIsSubmitting(true);
    };

    // The selection runs in the commit after the press, so the modal already has the restore focus type it needs by
    // the time it starts to hide.
    useLayoutEffect(() => {
        if (!isSubmitting || !isVisible) {
            return;
        }

        if (!isMobileSelectionModeEnabled) {
            turnOnMobileSelectionMode();
        }
        onSelect();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the hide has to start a commit after the restore focus type is set, see above
        setIsVisible(false);
        // This should only run once, when the user confirms the selection.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSubmitting]);

    useEffect(() => releaseBackgroundInputFocusSuppression, []);

    return (
        <Modal
            isVisible={isVisible}
            type={CONST.MODAL.MODAL_TYPE.BOTTOM_DOCKED}
            restoreFocusType={shouldSkipFocusRestore ? CONST.MODAL.RESTORE_FOCUS_TYPE.DELETE : undefined}
            onClose={() => setIsVisible(false)}
            onModalHide={() => {
                if (isVisible) {
                    return;
                }
                releaseBackgroundInputFocusSuppression();
                closeModal({action: isSubmitting ? ModalActions.CONFIRM : ModalActions.CLOSE});
            }}
            shouldPreventScrollOnFocus
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <View style={bottomSafeAreaPaddingStyle}>
                <MenuItemAction
                    title={translate('common.select')}
                    icon={expensifyIcons.CheckSquare}
                    onPress={handleSelectPress}
                    sentryLabel={sentryLabel}
                    testID={testID}
                />
            </View>
        </Modal>
    );
}

export default MobileSelectionMenuModalWrapper;
export type {MobileSelectionMenuModalWrapperProps};

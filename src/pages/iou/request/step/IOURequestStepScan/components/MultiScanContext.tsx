import {ModalActions, useModal} from '@components/Modal/Global/ModalContext';

import useOnyx from '@hooks/useOnyx';
import useShouldSuppressPromotionalUI from '@hooks/useShouldSuppressPromotionalUI';

import {dismissProductTraining} from '@libs/actions/Welcome';

import useScanRouteParams from '@pages/iou/request/step/IOURequestStepScan/hooks/useScanRouteParams';

import {removeDraftTransactionsByIDs, removeTransactionReceipt} from '@userActions/TransactionEdit';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import {validTransactionDraftIDsSelector} from '@src/selectors/TransactionDraft';

import React, {createContext, useContext, useEffect, useRef, useState} from 'react';

import MultiScanEducationalModal from './MultiScanEducationalModal';

const MULTI_SCAN_EDUCATIONAL_MODAL_ID = 'multi-scan-educational-modal';

type MultiScanState = {
    isMultiScanEnabled: boolean;
    canUseMultiScan: boolean;
};

type MultiScanActions = {
    toggleMultiScan: () => void;
    disableMultiScan: () => void;
};

const defaultState: MultiScanState = {
    isMultiScanEnabled: false,
    canUseMultiScan: false,
};

const defaultActions: MultiScanActions = {
    toggleMultiScan: () => {},
    disableMultiScan: () => {},
};

const MultiScanStateContext = createContext<MultiScanState>(defaultState);
const MultiScanActionsContext = createContext<MultiScanActions>(defaultActions);

function useMultiScanState(): MultiScanState {
    return useContext(MultiScanStateContext);
}

function useMultiScanActions(): MultiScanActions {
    return useContext(MultiScanActionsContext);
}

type MultiScanProviderProps = {
    children: React.ReactNode;
};

function MultiScanProvider({children}: MultiScanProviderProps) {
    const {iouType, routeName} = useScanRouteParams();

    const [isMultiScanEnabled, setIsMultiScanEnabled] = useState(false);
    const modalContext = useModal();
    // Show the educational modal at most once per scan session, so dismissing it without confirming doesn't make it reappear on every toggle
    const hasShownEducationalModalRef = useRef(false);
    const [dismissedProductTrainingResult] = useOnyx(ONYXKEYS.NVP_DISMISSED_PRODUCT_TRAINING);
    const [draftTransactionIDs] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_DRAFT, {selector: validTransactionDraftIDsSelector});
    const shouldSuppressPromotionalUI = useShouldSuppressPromotionalUI();

    const isStartingScan = routeName === SCREENS.MONEY_REQUEST.CREATE;
    const canUseMultiScan = isStartingScan && iouType !== CONST.IOU.TYPE.SPLIT;

    // The modal lives on the global stack, so take it down if the scan screen goes away while it is still open
    const modalContextRef = useRef(modalContext);
    useEffect(() => {
        modalContextRef.current = modalContext;
    }, [modalContext]);
    useEffect(() => () => modalContextRef.current.closeModalByID(MULTI_SCAN_EDUCATIONAL_MODAL_ID), []);

    function showEducationalModal() {
        hasShownEducationalModalRef.current = true;
        modalContext.showModal({component: MultiScanEducationalModal, id: MULTI_SCAN_EDUCATIONAL_MODAL_ID}).then(({action}) => {
            if (action !== ModalActions.CONFIRM) {
                return;
            }
            dismissProductTraining(CONST.PRODUCT_TRAINING_TOOLTIP_NAMES.MULTI_SCAN_EDUCATIONAL_MODAL);
        });
    }

    function toggleMultiScan() {
        if (!hasShownEducationalModalRef.current && !shouldSuppressPromotionalUI && !dismissedProductTrainingResult?.[CONST.PRODUCT_TRAINING_TOOLTIP_NAMES.MULTI_SCAN_EDUCATIONAL_MODAL]) {
            showEducationalModal();
        }
        removeTransactionReceipt(CONST.IOU.OPTIMISTIC_TRANSACTION_ID);
        removeDraftTransactionsByIDs(draftTransactionIDs, true);
        setIsMultiScanEnabled((prev) => !prev);
    }

    function disableMultiScan() {
        setIsMultiScanEnabled(false);
    }

    const stateValue: MultiScanState = {
        isMultiScanEnabled,
        canUseMultiScan,
    };

    const actionsValue: MultiScanActions = {
        toggleMultiScan,
        disableMultiScan,
    };

    return (
        <MultiScanActionsContext.Provider value={actionsValue}>
            <MultiScanStateContext.Provider value={stateValue}>{children}</MultiScanStateContext.Provider>
        </MultiScanActionsContext.Provider>
    );
}

export {MultiScanProvider, useMultiScanState, useMultiScanActions};

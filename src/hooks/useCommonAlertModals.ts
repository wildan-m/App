import useDecisionModal from './useDecisionModal';
import useLocalize from './useLocalize';

/** Shared one-button alerts ("You appear to be offline" and "Download failed") shown via the global decision modal stack. */
const useCommonAlertModals = () => {
    const {showDecisionModal} = useDecisionModal();
    const {translate} = useLocalize();

    const showOfflineModal = () => {
        showDecisionModal({
            title: translate('common.youAppearToBeOffline'),
            prompt: translate('common.offlinePrompt'),
            secondOptionText: translate('common.buttonConfirm'),
        });
    };

    const showDownloadErrorModal = () => {
        showDecisionModal({
            title: translate('common.downloadFailedTitle'),
            prompt: translate('common.downloadFailedDescription'),
            secondOptionText: translate('common.buttonConfirm'),
        });
    };

    return {
        showOfflineModal,
        showDownloadErrorModal,
    };
};

export default useCommonAlertModals;

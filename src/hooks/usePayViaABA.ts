import {useLockedAccountActions, useLockedAccountState} from '@components/LockedAccountModalProvider';

import deferModalPresentationAfterPopoverDismiss from '@libs/deferModalPresentationAfterPopoverDismiss';

import {payViaABA} from '@userActions/IOU/PayMoneyRequest';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type ExportDownload from '@src/types/onyx/ExportDownload';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import {hasSeenTourSelector} from '@selectors/Onboarding';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useDelegateAccountID from './useDelegateAccountID';
import useOnyx from './useOnyx';
import useVerifyAccountAndResume from './useVerifyAccountAndResume';

// The ABA file is still generating while an export download record for it is preparing
const isGeneratingABAFileSelector = (exportDownloads: OnyxCollection<ExportDownload>) =>
    Object.values(exportDownloads ?? {}).some(
        (exportDownload) => exportDownload?.exportType === CONST.EXPORT_DOWNLOAD.TYPE.ABA && exportDownload?.state === CONST.EXPORT_DOWNLOAD.STATE.PREPARING,
    );

/**
 * Returns a function that pays reports by generating their ABA file. Generation progress, the download itself and
 * failures are all surfaced by ExportDownloadStatusManager, which watches the exportDownload record payViaABA writes.
 * Locked accounts are shown the locked account modal instead, and unvalidated ones verify their account before it runs.
 * Also returns whether a file is still generating, so the Pay button can show it's loading.
 */
function usePayViaABA() {
    const {accountID} = useCurrentUserPersonalDetails();
    const delegateAccountID = useDelegateAccountID();
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [isSelfTourViewed = false] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: hasSeenTourSelector});
    const [userBillingGracePeriodEnds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END);
    const [amountOwed] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [conciergeChat] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`);
    const {isAccountLocked} = useLockedAccountState();
    const {showLockedAccountModal} = useLockedAccountActions();
    const {isUserValidated, verifyAccountAndResume} = useVerifyAccountAndResume((resume) => resume?.());
    const [isDownloadingABAFile = false] = useOnyx(ONYXKEYS.COLLECTION.EXPORT_DOWNLOAD, {selector: isGeneratingABAFileSelector});

    const downloadABAFile = (reportIDs: string[], policy: OnyxEntry<Policy>, shouldReimburseHeldTransactions?: boolean) => {
        payViaABA({
            reportIDs,
            policy,
            shouldReimburseHeldTransactions,
            introSelected,
            isSelfTourViewed,
            currentUserAccountID: accountID,
            conciergeChat,
            delegateAccountID,
            userBillingGracePeriodEnds,
            amountOwed,
            ownerBillingGracePeriodEnd,
        });
    };

    // Pay via ABA is always picked from a menu, so anything blocking it is shown once that menu has closed
    const payReportsViaABA = (reportIDs: string[], policy: OnyxEntry<Policy>, shouldReimburseHeldTransactions?: boolean) => {
        if (isAccountLocked) {
            deferModalPresentationAfterPopoverDismiss(showLockedAccountModal);
            return;
        }
        if (!isUserValidated) {
            deferModalPresentationAfterPopoverDismiss(() => verifyAccountAndResume(() => downloadABAFile(reportIDs, policy, shouldReimburseHeldTransactions)));
            return;
        }
        downloadABAFile(reportIDs, policy, shouldReimburseHeldTransactions);
    };

    return {payReportsViaABA, isDownloadingABAFile};
}

export default usePayViaABA;

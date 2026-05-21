import {useEffect} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {isConnectionInProgress} from '@libs/actions/connections';
import CONST from '@src/CONST';
import type {ConnectionName, PolicyConnectionSyncProgress} from '@src/types/onyx/Policy';
import type Policy from '@src/types/onyx/Policy';
import useConfirmModal from './useConfirmModal';
import useLocalize from './useLocalize';
import usePrevious from './usePrevious';

const HR_CONNECTION_NAMES: ConnectionName[] = [...CONST.POLICY.CONNECTIONS.HR_CONNECTION_NAMES];

/**
 * Shows a one-time "Your connection is syncing" modal the first time an HR integration starts syncing on a workspace.
 * "First time" is derived from the absence of a previous successful sync on the connection, so no extra Onyx state is needed.
 * The modal is dismissed with a single "Got it" button and stays out of the way on subsequent syncs.
 */
function useHRFirstSyncModal(policyID: string, connectionSyncProgress: OnyxEntry<PolicyConnectionSyncProgress>, policy: OnyxEntry<Policy>, isFocused: boolean) {
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const previousSyncProgress = usePrevious(connectionSyncProgress);

    useEffect(() => {
        const connectionName = connectionSyncProgress?.connectionName;
        if (!isFocused || !connectionName || !HR_CONNECTION_NAMES.includes(connectionName)) {
            return;
        }

        const isSyncingNow = isConnectionInProgress(connectionSyncProgress, policy);
        const wasSyncingBefore = previousSyncProgress?.connectionName === connectionName && isConnectionInProgress(previousSyncProgress, policy);
        const didStartSyncing = isSyncingNow && !wasSyncingBefore;

        // Only show the modal for the very first connection, i.e. when there is no successful sync recorded yet.
        const connection = policy?.connections?.[connectionName] as {lastSync?: {successfulDate?: string}} | undefined;
        const hasSyncedBefore = !!connection?.lastSync?.successfulDate;

        if (!didStartSyncing || hasSyncedBefore) {
            return;
        }

        showConfirmModal({
            id: `hr-first-sync-${policyID}-${connectionName}`,
            title: translate('workspace.hr.firstSync.title'),
            prompt: translate('workspace.hr.firstSync.prompt'),
            confirmText: translate('common.buttonConfirm'),
            shouldShowCancelButton: false,
        });
    }, [connectionSyncProgress, policy, previousSyncProgress, isFocused, policyID, showConfirmModal, translate]);
}

export default useHRFirstSyncModal;

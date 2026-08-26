import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDelegateAccountID from '@hooks/useDelegateAccountID';
import useOnyx from '@hooks/useOnyx';
import useOpenConciergeAnywhere from '@hooks/useOpenConciergeAnywhere';
import useSidePanelReportID from '@hooks/useSidePanelReportID';

import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';

import {addAttachmentWithComment, addComment, loadConciergeChat} from '@userActions/Report';
import {onServerDataReady} from '@userActions/Welcome';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import {hasSeenTourSelector} from '@selectors/Onboarding';
import {useEffect, useRef, useState} from 'react';

/**
 * Returns a callback that opens the side panel (or Concierge chat on native)
 * and sends the provided search query as a message.
 * Also returns a flag indicating whether the Ask Concierge item is ready to be displayed.
 *
 * @param forceConcierge Always target the Concierge report, ignoring the report the side panel currently maps to.
 */
function useAskConcierge({forceConcierge = false}: {forceConcierge?: boolean} = {}) {
    const sidePanelReportID = useSidePanelReportID();
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const {openConciergeAnywhere, isInSidePanel} = useOpenConciergeAnywhere();

    // The Concierge chat is only loaded on demand, so when this hook drives an always-visible composer we load it
    // ourselves and target the report we asked for until the conciergeReportID NVP catches up.
    const [loadedConciergeReportID, setLoadedConciergeReportID] = useState<string>();
    const targetReportID = !forceConcierge && isInSidePanel && sidePanelReportID ? sidePanelReportID : (conciergeReportID ?? loadedConciergeReportID);
    const [targetReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(targetReportID)}`);
    const {timezone, accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const delegateAccountID = useDelegateAccountID();
    const shouldShowAskConcierge = !!targetReportID && !!targetReport;

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [isSelfTourViewed] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: hasSeenTourSelector});
    const [isServerDataReady, setIsServerDataReady] = useState(false);
    const hasLoadedConciergeChat = useRef(false);

    useEffect(() => {
        if (!forceConcierge) {
            return;
        }
        let isMounted = true;
        // Waiting for OpenApp keeps us from creating a second Concierge chat before the server tells us about the existing one.
        onServerDataReady().then(() => {
            if (!isMounted) {
                return;
            }
            setIsServerDataReady(true);
        });
        return () => {
            isMounted = false;
        };
    }, [forceConcierge]);

    useEffect(() => {
        if (!forceConcierge || !isServerDataReady || shouldShowAskConcierge || hasLoadedConciergeChat.current) {
            return;
        }
        hasLoadedConciergeChat.current = true;
        setLoadedConciergeReportID(
            loadConciergeChat({
                conciergeReportID,
                personalDetails,
                currentUserAccountID,
                introSelected,
                isSelfTourViewed,
                betas,
            }),
        );
    }, [forceConcierge, isServerDataReady, shouldShowAskConcierge, conciergeReportID, personalDetails, currentUserAccountID, introSelected, isSelfTourViewed, betas]);

    const askConcierge = (searchQuery: string) => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery || !shouldShowAskConcierge) {
            return;
        }
        openConciergeAnywhere({forceConcierge});
        addComment({
            report: targetReport,
            notifyReportID: targetReportID,
            ancestors: [],
            text: trimmedQuery,
            timezoneParam: timezone ?? CONST.DEFAULT_TIME_ZONE,
            currentUserAccountID,
            shouldPlaySound: true,
            isInSidePanel,
            delegateAccountID,
            conciergeReportID,
        });
    };

    const askConciergeWithAttachment = (attachments: FileObject | FileObject[], searchQuery: string) => {
        if (!shouldShowAskConcierge) {
            return;
        }
        openConciergeAnywhere({forceConcierge});
        addAttachmentWithComment({
            report: targetReport,
            notifyReportID: targetReportID,
            ancestors: [],
            attachments,
            currentUserAccountID,
            text: searchQuery.trim(),
            timezone: timezone ?? CONST.DEFAULT_TIME_ZONE,
            shouldPlaySound: true,
            isInSidePanel,
            delegateAccountID,
            conciergeReportID,
        });
    };

    return {askConcierge, askConciergeWithAttachment, shouldShowAskConcierge, conciergeTargetReportID: targetReportID};
}

export default useAskConcierge;

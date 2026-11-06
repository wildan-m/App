/**
 * Lists a domain's outstanding account merge requests above the Domain Members table, and confirms the outcome of decisions once the server has answered.
 */
import Text from '@components/Text';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLayoutSpacing from '@hooks/useLayoutSpacing';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import useThemeStyles from '@hooks/useThemeStyles';

import {removeDomainAccountMergeRequest} from '@libs/actions/DomainAccountMergeRequest';
import {getDomainAccountMergeRequestExpirationTime, getReviewableDomainAccountMergeRequests, getSettledDomainAccountMergeRequests} from '@libs/DomainAccountMergeRequestUtils';
import Growl from '@libs/Growl';
import Visibility from '@libs/Visibility';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import DomainAccountMergeRequestRow from './DomainAccountMergeRequestRow';

type DomainAccountMergeRequestsSectionProps = {
    domainAccountID: number;
};

function DomainAccountMergeRequestsSection({domainAccountID}: DomainAccountMergeRequestsSectionProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {pageGutter} = useLayoutSpacing();
    const {isBetaEnabled} = usePermissions();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const [requests] = useOnyx(ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST);
    const [now, setNow] = useState(() => Date.now());
    const handledRequestIDs = useRef(new Set<string>());

    const isEnabled = isBetaEnabled(CONST.BETAS.MERGE_DOMAIN_ACCOUNTS);
    const reviewableRequests = isEnabled ? getReviewableDomainAccountMergeRequests(requests, domainAccountID, currentUserAccountID, now) : [];
    const firstRequest = reviewableRequests.at(0);
    const earliestExpirationTime = firstRequest ? getDomainAccountMergeRequestExpirationTime(firstRequest) : undefined;

    // Crossing the expiry time doesn't change Onyx, so nothing else would make an expired row go away.
    useEffect(() => {
        if (earliestExpirationTime === undefined) {
            return;
        }
        const timer = setTimeout(() => setNow(Date.now()), Math.max(earliestExpirationTime - Date.now(), 0));
        return () => clearTimeout(timer);
    }, [earliestExpirationTime]);

    // Timers don't run reliably while the app is in the background.
    useEffect(() => Visibility.onVisibilityChange(() => setNow(Date.now())), []);

    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        for (const request of getSettledDomainAccountMergeRequests(requests, domainAccountID)) {
            // Removing the record is asynchronous, so another update can run this effect again before the record is gone.
            if (handledRequestIDs.current.has(request.requestID)) {
                continue;
            }
            handledRequestIDs.current.add(request.requestID);

            if (request.resolvedDecision === CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED) {
                Growl.success({bodyText: translate('domain.members.accountMergeRequests.approved')});
            } else if (request.resolvedDecision === CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.DENIED) {
                Growl.error({bodyText: translate('domain.members.accountMergeRequests.denied')});
            } else if (request.errors) {
                // The server removed the request and rejected the action, which is what happens when another admin decides first.
                Growl.error({bodyText: translate('domain.members.accountMergeRequests.noLongerPending')});
            }
            removeDomainAccountMergeRequest(request.requestID);
        }
    }, [isEnabled, requests, domainAccountID, translate]);

    if (reviewableRequests.length === 0) {
        return null;
    }

    return (
        <View style={[pageGutter, styles.gap3, styles.mb5]}>
            <Text style={[styles.textMicroBoldSupporting, styles.lh14]}>{translate('domain.members.accountMergeRequests.title')}</Text>
            {reviewableRequests.map((request) => (
                <DomainAccountMergeRequestRow
                    key={request.requestID}
                    requestID={request.requestID}
                    domainAccountID={domainAccountID}
                />
            ))}
        </View>
    );
}

export default DomainAccountMergeRequestsSection;

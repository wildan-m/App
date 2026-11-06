/**
 * One account merge request on the Domain Members page, with the Approve and Deny controls for people allowed to decide it.
 */
import AccountAvatar from '@components/Avatar/connected/AccountAvatar';
import Button from '@components/Button';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import Text from '@components/Text';
import TextWithTooltip from '@components/TextWithTooltip';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import {useAllPersonalDetails} from '@hooks/usePersonalDetails';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import {approveDomainAccountMergeRequest, clearDomainAccountMergeRequestErrors, denyDomainAccountMergeRequest} from '@libs/actions/DomainAccountMergeRequest';
import {canDecideDomainAccountMergeRequest} from '@libs/DomainAccountMergeRequestUtils';
import {temporaryGetDisplayNameOrDefault} from '@libs/PersonalDetailsUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {technicalContactSettingsSelector} from '@selectors/Domain';
import React from 'react';
import {View} from 'react-native';

type DomainAccountMergeRequestRowProps = {
    requestID: string;
    domainAccountID: number;
};

function DomainAccountMergeRequestRow({requestID, domainAccountID}: DomainAccountMergeRequestRowProps) {
    const styles = useThemeStyles();
    const {translate, formatPhoneNumber} = useLocalize();
    const {isOffline} = useNetwork();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {accountID: currentUserAccountID, login: currentUserLogin} = useCurrentUserPersonalDetails();
    const [personalDetails] = useAllPersonalDetails();

    const [request] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ACCOUNT_MERGE_REQUEST}${requestID}`);
    const targetDomainAccountID = request?.targetDomainAccountID;
    const [sourceDomain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`);
    const [targetDomain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${targetDomainAccountID}`);
    const [sourceDomainTechnicalContact] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${domainAccountID}`, {selector: technicalContactSettingsSelector});
    const [targetDomainTechnicalContact] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${targetDomainAccountID}`, {selector: technicalContactSettingsSelector});

    if (!request) {
        return null;
    }

    const requesterDetails = personalDetails?.[request.requesterAccountID];
    const requesterName = temporaryGetDisplayNameOrDefault({passedPersonalDetails: requesterDetails, translate, formatPhoneNumber});
    const sourceLogin = formatPhoneNumber(request.sourceLogin);
    const targetLogin = formatPhoneNumber(request.targetLogin ?? requesterDetails?.login ?? '');
    const mergeDirection = translate('domain.members.accountMergeRequests.mergeDirection', sourceLogin, targetLogin);

    const canDecide = canDecideDomainAccountMergeRequest({
        request,
        currentUserAccountID,
        currentUserLogin,
        sourceDomain,
        targetDomain,
        sourceDomainTechnicalContactEmail: sourceDomainTechnicalContact?.technicalContactEmail,
        targetDomainTechnicalContactEmail: targetDomainTechnicalContact?.technicalContactEmail,
    });
    const isApproving = request.pendingDecision === CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.APPROVED;
    const isDenying = request.pendingDecision === CONST.DOMAIN_ACCOUNT_MERGE_REQUEST.DECISION.DENIED;

    return (
        <OfflineWithFeedback
            errors={request.errors}
            onClose={() => clearDomainAccountMergeRequestErrors(requestID)}
        >
            <View style={[shouldUseNarrowLayout ? styles.gap3 : [styles.flexRow, styles.alignItemsCenter, styles.gap3]]}>
                <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter]}>
                    <AccountAvatar
                        size={CONST.AVATAR_SIZE.DEFAULT}
                        accountID={request.requesterAccountID}
                        fallbackDisplayName={requesterName}
                    />
                    <View style={[styles.flex1, styles.gap1]}>
                        <TextWithTooltip
                            shouldShowTooltip
                            text={requesterName}
                            style={[styles.optionDisplayName, styles.pre]}
                        />
                        <Text style={styles.textLabelSupporting}>{mergeDirection}</Text>
                    </View>
                </View>
                {canDecide ? (
                    <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap2]}>
                        <Button
                            variant={CONST.BUTTON_VARIANT.SUCCESS}
                            size={CONST.BUTTON_SIZE.SMALL}
                            onPress={() => approveDomainAccountMergeRequest(requestID, domainAccountID)}
                            isLoading={isApproving}
                            // Disabled offline because a queued decision could run after the request has expired or the admin has lost access.
                            isDisabled={isOffline || isDenying}
                            accessibilityLabel={[translate('common.approve'), mergeDirection].join(', ')}
                            sentryLabel={CONST.SENTRY_LABEL.DOMAIN.MEMBERS.ACCOUNT_MERGE_REQUEST_APPROVE}
                        >
                            <Button.Text>{translate('common.approve')}</Button.Text>
                        </Button>
                        <Button
                            size={CONST.BUTTON_SIZE.SMALL}
                            onPress={() => denyDomainAccountMergeRequest(requestID, domainAccountID)}
                            isLoading={isDenying}
                            isDisabled={isOffline || isApproving}
                            accessibilityLabel={[translate('common.deny'), mergeDirection].join(', ')}
                            sentryLabel={CONST.SENTRY_LABEL.DOMAIN.MEMBERS.ACCOUNT_MERGE_REQUEST_DENY}
                        >
                            <Button.Text>{translate('common.deny')}</Button.Text>
                        </Button>
                    </View>
                ) : (
                    <Text style={[styles.flex1, styles.textLabelSupporting]}>{translate('domain.members.accountMergeRequests.requiresSharedTechnicalContact')}</Text>
                )}
            </View>
        </OfflineWithFeedback>
    );
}

export default DomainAccountMergeRequestRow;

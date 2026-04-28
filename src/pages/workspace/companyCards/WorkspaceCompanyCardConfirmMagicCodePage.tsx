import React, {useCallback, useState} from 'react';
import ValidateCodeActionContent from '@components/ValidateCodeActionModal/ValidateCodeActionContent';
import useCardFeedsForActivePolicies from '@hooks/useCardFeedsForActivePolicies';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePrimaryContactMethod from '@hooks/usePrimaryContactMethod';
import {requestValidateCodeAction, resetValidateActionCodeSent, setContactMethodAsDefault} from '@libs/actions/User';
import {getFeedInfo} from '@libs/CardFeedUtils';
import {getCardFeedWithDomainID} from '@libs/CardUtils';
import {addErrorMessage} from '@libs/ErrorUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import {updateSelectedFeed} from '@userActions/Card';
import {linkCardFeedToPolicy} from '@userActions/CompanyCards';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/AddWorkEmailForm';
import type {CompanyCardFeedWithDomainID, CompanyCardFeedWithNumber} from '@src/types/onyx/CardFeeds';
import type {Errors} from '@src/types/onyx/OnyxCommon';

type WorkspaceCompanyCardConfirmMagicCodePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.COMPANY_CARD_CONFIRM_MAGIC_CODE>;

function WorkspaceCompanyCardConfirmMagicCodePage({route}: WorkspaceCompanyCardConfirmMagicCodePageProps) {
    const {policyID, feed, targetEmail} = route.params;
    const {translate, formatPhoneNumber} = useLocalize();
    const primaryLogin = usePrimaryContactMethod();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [validateCodeAction] = useOnyx(ONYXKEYS.VALIDATE_ACTION_CODE);
    const {cardFeedsByPolicy} = useCardFeedsForActivePolicies();
    const feedInfo = getFeedInfo(feed, cardFeedsByPolicy);
    const [linkError, setLinkError] = useState<Errors | undefined>(undefined);
    const [isLinking, setIsLinking] = useState(false);

    const handleSubmit = useCallback(
        (validateCode: string) => {
            setContactMethodAsDefault(currentUserPersonalDetails, allPolicies, targetEmail, formatPhoneNumber, undefined, true, validateCode);

            if (!feedInfo) {
                return;
            }
            setIsLinking(true);
            const feedValue = getCardFeedWithDomainID(feedInfo.feed, feedInfo.fundID) as CompanyCardFeedWithDomainID;
            linkCardFeedToPolicy(Number(feedInfo.fundID), policyID, CONST.COMPANY_CARD.LINK_FEED_TYPE.COMPANY_CARD, feedInfo?.country, feedInfo.feed as CompanyCardFeedWithNumber)
                .then(() => {
                    updateSelectedFeed(feedValue, policyID);
                    Navigation.closeRHPFlow();
                })
                .catch((error: TranslationPaths) => {
                    const errors = {};
                    addErrorMessage(errors, INPUT_IDS.EMAIL, translate(error));
                    setLinkError(errors);
                })
                .finally(() => {
                    setIsLinking(false);
                });
        },
        [allPolicies, currentUserPersonalDetails, feedInfo, formatPhoneNumber, policyID, targetEmail],
    );

    return (
        <ValidateCodeActionContent
            validateCodeActionErrorField="setContactMethodAsDefault"
            handleSubmitForm={handleSubmit}
            isLoading={isLinking || validateCodeAction?.isLoading}
            title={translate('workspace.companyCards.confirmWorkEmailMagicCode.title')}
            descriptionPrimary={translate('workspace.companyCards.confirmWorkEmailMagicCode.description', {primaryLogin: primaryLogin ?? ''})}
            sendValidateCode={() => requestValidateCodeAction()}
            validateError={linkError ?? validateCodeAction?.errorFields?.actionVerified ?? undefined}
            clearError={() => setLinkError(undefined)}
            onClose={() => {
                resetValidateActionCodeSent();
                Navigation.goBack(ROUTES.WORKSPACE_COMPANY_CARD_ADD_WORK_EMAIL.getRoute(policyID, feed));
            }}
        />
    );
}

export default WorkspaceCompanyCardConfirmMagicCodePage;

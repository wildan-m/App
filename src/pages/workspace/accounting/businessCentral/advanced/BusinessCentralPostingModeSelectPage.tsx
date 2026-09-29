/**
 * Posting mode for the Business Central connection: whether exported journals are created and posted, or only
 * created for review in Business Central.
 */
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import type {SelectorType} from '@components/SelectionScreen';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearBusinessCentralErrorField, updateBusinessCentralPostingMode} from '@libs/actions/connections/BusinessCentral';
import {getLatestErrorField} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import {settingsPendingAction} from '@libs/PolicyUtils';

import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import type {ValueOf} from 'type-fest';

import React from 'react';

type PostingModeListItem = ListItem & {
    value: ValueOf<typeof CONST.BUSINESS_CENTRAL_POSTING_MODE>;
};

function BusinessCentralPostingModeSelectPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = policy?.id;
    const businessCentralConfig = policy?.connections?.businessCentral?.config;
    const postingMode = businessCentralConfig?.export?.postingMode ?? CONST.BUSINESS_CENTRAL_POSTING_MODE.CREATE_AND_POST;
    const backPath = policyID ? ROUTES.POLICY_ACCOUNTING_BUSINESS_CENTRAL_ADVANCED.getRoute(policyID) : undefined;

    const data: PostingModeListItem[] = Object.values(CONST.BUSINESS_CENTRAL_POSTING_MODE).map((mode) => ({
        value: mode,
        text: translate(`workspace.businessCentral.advanced.postingMode.values.${mode}`),
        keyForList: mode,
        isSelected: postingMode === mode,
    }));

    const selectPostingMode = (row: PostingModeListItem) => {
        if (row.value !== postingMode && policyID) {
            updateBusinessCentralPostingMode(policyID, row.value, postingMode);
        }
        Navigation.goBack(backPath);
    };

    return (
        <SelectionScreen
            displayName="BusinessCentralPostingModeSelectPage"
            title="workspace.businessCentral.advanced.postingMode.label"
            data={data}
            onSelectRow={(selection: SelectorType) => selectPostingMode(selection as PostingModeListItem)}
            initiallyFocusedOptionKey={data.find((mode) => mode.isSelected)?.keyForList}
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.CONTROL]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            onBackButtonPress={() => Navigation.goBack(backPath)}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL}
            pendingAction={settingsPendingAction([CONST.BUSINESS_CENTRAL_CONFIG.POSTING_MODE], businessCentralConfig?.pendingFields)}
            errors={getLatestErrorField(businessCentralConfig, CONST.BUSINESS_CENTRAL_CONFIG.POSTING_MODE)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => policyID && clearBusinessCentralErrorField(policyID, CONST.BUSINESS_CENTRAL_CONFIG.POSTING_MODE)}
        />
    );
}

export default withPolicyConnections(BusinessCentralPostingModeSelectPage);

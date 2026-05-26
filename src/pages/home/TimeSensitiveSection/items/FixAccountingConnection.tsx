import React from 'react';
import BaseWidgetItem from '@components/BaseWidgetItem';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import Navigation from '@libs/Navigation/Navigation';
import {isAccountingConnectionName} from '@libs/PolicyUtils';
import colors from '@styles/theme/colors';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {PolicyConnectionName} from '@src/types/onyx/Policy';

type FixAccountingConnectionProps = {
    /** The connection name that has an error */
    connectionName: PolicyConnectionName;

    /** The policy ID associated with this connection */
    policyID: string;

    /** The policy name associated with this connection */
    policyName: string;
};

function FixAccountingConnection({connectionName, policyID, policyName}: FixAccountingConnectionProps) {
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Connect']);

    const integrationName = CONST.POLICY.CONNECTIONS.NAME_USER_FRIENDLY[connectionName];
    const subtitle = policyName
        ? translate('homePage.timeSensitiveSection.fixAccountingConnection.subtitle', {policyName})
        : translate('homePage.timeSensitiveSection.fixAccountingConnection.defaultSubtitle');

    // Accounting connections (QBO, Xero, NetSuite, etc.) are fixed on the workspace Accounting page,
    // while HRIS connections (Gusto, TriNet/Zenefits, Merge HR) are fixed on the workspace HR page.
    const fixConnectionRoute = isAccountingConnectionName(connectionName) ? ROUTES.WORKSPACE_ACCOUNTING.getRoute(policyID) : ROUTES.WORKSPACE_HR.getRoute(policyID);

    return (
        <BaseWidgetItem
            icon={icons.Connect}
            iconBackgroundColor={colors.tangerine100}
            iconFill={colors.tangerine500}
            title={translate('homePage.timeSensitiveSection.fixAccountingConnection.title', {integrationName})}
            subtitle={subtitle}
            ctaText={translate('homePage.timeSensitiveSection.ctaFix')}
            onCtaPress={() => Navigation.navigate(fixConnectionRoute)}
            buttonProps={{danger: true}}
        />
    );
}

export default FixAccountingConnection;

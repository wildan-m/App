import BaseWidgetItem from '@components/BaseWidgetItem';

import useEnvironment from '@hooks/useEnvironment';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import {getNetSuiteOAuthSetupLink} from '@libs/actions/connections/NetSuiteCommands';
import {openLink} from '@libs/actions/Link';

import colors from '@styles/theme/colors';

import React from 'react';

type UpgradeNetSuiteConnectionProps = {
    /** The policy ID whose NetSuite connection needs the OAuth 2.0 upgrade */
    policyID: string;

    /** The policy name associated with this connection */
    policyName: string;
};

function UpgradeNetSuiteConnection({policyID, policyName}: UpgradeNetSuiteConnectionProps) {
    const {translate} = useLocalize();
    const {environmentURL} = useEnvironment();
    const icons = useMemoizedLazyExpensifyIcons(['Connect']);

    const subtitle = policyName
        ? translate('homePage.timeSensitiveSection.upgradeNetSuiteConnection.subtitle', {policyName})
        : translate('homePage.timeSensitiveSection.upgradeNetSuiteConnection.defaultSubtitle');

    return (
        <BaseWidgetItem
            icon={icons.Connect}
            iconBackgroundColor={colors.tangerine100}
            iconFill={colors.tangerine500}
            title={translate('homePage.timeSensitiveSection.upgradeNetSuiteConnection.title')}
            subtitle={subtitle}
            ctaText={translate('homePage.timeSensitiveSection.ctaFix')}
            onCtaPress={() => openLink(getNetSuiteOAuthSetupLink(policyID), environmentURL)}
            buttonProps={{danger: true}}
        />
    );
}

export default UpgradeNetSuiteConnection;

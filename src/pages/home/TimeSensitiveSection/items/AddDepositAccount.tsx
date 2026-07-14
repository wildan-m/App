import BaseWidgetItem from '@components/BaseWidgetItem';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';

import {openPersonalBankAccountSetupView} from '@userActions/BankAccounts';

import React from 'react';

function AddDepositAccount() {
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank']);
    const theme = useTheme();

    return (
        <BaseWidgetItem
            icon={icons.Bank}
            iconBackgroundColor={theme.widgetIconBG}
            iconFill={theme.widgetIconFill}
            title={translate('homePage.timeSensitiveSection.addDepositAccount.title')}
            subtitle={translate('homePage.timeSensitiveSection.addDepositAccount.subtitle')}
            ctaText={translate('homePage.timeSensitiveSection.ctaFix')}
            onCtaPress={() => openPersonalBankAccountSetupView({})}
            buttonProps={{success: true}}
        />
    );
}

export default AddDepositAccount;

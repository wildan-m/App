import BaseWidgetItem from '@components/BaseWidgetItem';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import colors from '@styles/theme/colors';

import {resetEmailDeliveryFailureStatus} from '@userActions/Session';

import ONYXKEYS from '@src/ONYXKEYS';

import {emailSelector} from '@selectors/Session';
import React from 'react';

function FixEmailDeliveryFailure() {
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Mail']);
    const [sessionEmail] = useOnyx(ONYXKEYS.SESSION, {selector: emailSelector});

    const handleCtaPress = () => {
        if (!sessionEmail) {
            return;
        }
        resetEmailDeliveryFailureStatus(sessionEmail);
    };

    return (
        <BaseWidgetItem
            icon={icons.Mail}
            iconBackgroundColor={colors.tangerine100}
            iconFill={colors.tangerine500}
            title={translate('homePage.timeSensitiveSection.fixEmailDeliveryFailure.title')}
            subtitle={translate('homePage.timeSensitiveSection.fixEmailDeliveryFailure.subtitle')}
            ctaText={translate('homePage.timeSensitiveSection.fixEmailDeliveryFailure.cta')}
            onCtaPress={handleCtaPress}
            buttonProps={{danger: true}}
        />
    );
}

export default FixEmailDeliveryFailure;

import React, {useState} from 'react';
import Banner from '@components/Banner';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNotificationsPermission from '@hooks/useNotificationsPermission';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {isConciergeChatReport} from '@libs/ReportUtils';
import ONYXKEYS from '@src/ONYXKEYS';

type EnableNotificationsBannerProps = {
    reportID: string | undefined;
};

function EnableNotificationsBanner({reportID}: EnableNotificationsBannerProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['Bell']);
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(reportID)}`);
    const {isEnabled, isPromptable, requestPermission} = useNotificationsPermission();
    const [isBannerVisible, setIsBannerVisible] = useState(true);

    if (!isConciergeChatReport(report) || isEnabled || !isPromptable || !isBannerVisible) {
        return null;
    }

    const dismissBanner = () => setIsBannerVisible(false);
    const enableNotifications = () => {
        requestPermission().then((granted) => {
            if (!granted) {
                return;
            }
            setIsBannerVisible(false);
        });
    };

    return (
        <Banner
            containerStyles={[styles.mh4, styles.mt4, styles.p4, styles.br2, styles.breakWord]}
            text={translate('enableNotificationsBanner.text')}
            buttonText={translate('enableNotificationsBanner.notifyMe')}
            onClose={dismissBanner}
            onButtonPress={enableNotifications}
            shouldShowCloseButton
            icon={expensifyIcons.Bell}
            shouldShowIcon
            shouldShowButton
        />
    );
}

EnableNotificationsBanner.displayName = 'EnableNotificationsBanner';

export default EnableNotificationsBanner;

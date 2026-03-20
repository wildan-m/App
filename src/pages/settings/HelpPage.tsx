import React, {useMemo} from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemList from '@components/MenuItemList';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import {openExternalLink} from '@userActions/Link';
import {navigateToConciergeChat} from '@userActions/Report';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type IconAsset from '@src/types/utils/IconAsset';

type HelpMenuItem = {
    translationKey: TranslationPaths;
    icon: IconAsset;
    iconRight?: IconAsset;
    shouldShowRightIcon?: boolean;
    action: () => void;
    link?: string;
};

function HelpPage() {
    const icons = useMemoizedLazyExpensifyIcons(['ChatBubble', 'NewWindow']);
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const menuItems = useMemo(() => {
        const baseItems: HelpMenuItem[] = [
            {
                translationKey: 'helpPage.concierge',
                icon: icons.ChatBubble,
                action: () => {
                    navigateToConciergeChat(conciergeReportID, introSelected, currentUserAccountID ?? CONST.DEFAULT_NUMBER_ID, true, () => true);
                },
            },
            {
                translationKey: 'helpPage.helpSite',
                icon: icons.NewWindow,
                iconRight: icons.NewWindow,
                shouldShowRightIcon: true,
                link: CONST.NEWHELP_URL,
                action: () => {
                    openExternalLink(CONST.NEWHELP_URL);
                },
            },
        ];

        return baseItems.map(({translationKey, icon, iconRight, shouldShowRightIcon, action, link}) => ({
            key: translationKey,
            title: translate(translationKey),
            icon,
            iconRight,
            shouldShowRightIcon: shouldShowRightIcon ?? false,
            onPress: action,
            link,
        }));
    }, [icons, translate, conciergeReportID, introSelected, currentUserAccountID]);

    return (
        <ScreenWrapper testID="HelpPage">
            <HeaderWithBackButton
                title={translate('initialSettingsPage.help')}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS)}
            />
            <ScrollView contentContainerStyle={[styles.pt3]}>
                <MenuItemList
                    menuItems={menuItems}
                    shouldUseSingleExecution
                />
            </ScrollView>
        </ScreenWrapper>
    );
}

HelpPage.displayName = 'HelpPage';

export default HelpPage;

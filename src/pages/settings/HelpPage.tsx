import React, {useMemo, useRef} from 'react';
import {View} from 'react-native';
// eslint-disable-next-line no-restricted-imports
import type {GestureResponderEvent} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemList from '@components/MenuItemList';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import useDocumentTitle from '@hooks/useDocumentTitle';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import {showContextMenu} from '@pages/inbox/report/ContextMenu/ReportActionContextMenu';
import {openExternalLink} from '@userActions/Link';
import CONST from '@src/CONST';

function HelpPage() {
    const icons = useMemoizedLazyExpensifyIcons(['NewWindow', 'QuestionMark']);
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const popoverAnchor = useRef<View>(null);
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    useDocumentTitle(translate('initialSettingsPage.help'));

    const menuItems = useMemo(
        () => [
            {
                key: 'visitHelpWebsite',
                title: translate('initialSettingsPage.helpPage.visitHelpWebsite'),
                icon: icons.QuestionMark,
                iconRight: icons.NewWindow,
                shouldShowRightIcon: true,
                onPress: () => {
                    openExternalLink(CONST.NEWHELP_URL);
                },
                onSecondaryInteraction: (event: GestureResponderEvent | MouseEvent) =>
                    showContextMenu({
                        type: CONST.CONTEXT_MENU_TYPES.LINK,
                        event,
                        selection: CONST.NEWHELP_URL,
                        contextMenuAnchor: popoverAnchor.current,
                    }),
                ref: popoverAnchor,
                shouldBlockSelection: true,
                wrapperStyle: [styles.sectionMenuItemTopDescription],
            },
        ],
        [icons, styles, translate],
    );

    return (
        <ScreenWrapper
            shouldEnablePickerAvoiding={false}
            shouldShowOfflineIndicatorInWideScreen
            testID="HelpPage"
        >
            <HeaderWithBackButton
                title={translate('initialSettingsPage.help')}
                shouldShowBackButton={shouldUseNarrowLayout}
                shouldDisplaySearchRouter
                shouldDisplayHelpButton
                onBackButtonPress={Navigation.goBack}
                shouldUseHeadlineHeader
            />
            <ScrollView contentContainerStyle={styles.pt3}>
                <View style={[styles.flex1, shouldUseNarrowLayout ? styles.workspaceSectionMobile : styles.workspaceSection]}>
                    <Section
                        title={translate('initialSettingsPage.help')}
                        subtitle={translate('initialSettingsPage.helpPage.description')}
                        isCentralPane
                        subtitleMuted
                        titleStyles={styles.accountSettingsSectionTitle}
                    >
                        <View style={[styles.flex1, styles.mt5]}>
                            <MenuItemList
                                menuItems={menuItems}
                                shouldUseSingleExecution
                            />
                        </View>
                    </Section>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default HelpPage;

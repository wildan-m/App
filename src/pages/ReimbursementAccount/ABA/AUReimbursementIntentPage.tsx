import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Icon from '@components/Icon';
import MenuItemContent from '@components/MenuItem/layout/MenuItemContent';
import MenuItemLeading from '@components/MenuItem/layout/MenuItemLeading';
import MenuItemRoot from '@components/MenuItem/layout/MenuItemRoot';
import MenuItemRow from '@components/MenuItem/layout/MenuItemRow';
import MenuItemTrailing from '@components/MenuItem/layout/MenuItemTrailing';
import MenuItemDescription from '@components/MenuItem/leaves/content/MenuItemDescription';
import MenuItemTitle from '@components/MenuItem/leaves/content/MenuItemTitle';
import MenuItemChevron from '@components/MenuItem/leaves/trailing/icons/MenuItemChevron';
import Text from '@components/Text';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import type IconAsset from '@src/types/utils/IconAsset';

import React from 'react';
import {View} from 'react-native';

type AUReimbursementIntentPageProps = {
    /** Continues into the Expensify business bank account setup */
    onPayViaExpensify: () => void;

    /** Opens the ABA withdrawal account form */
    onPayViaABA: () => void;
};

type IntentOption = {
    title: string;
    description: string;
    icon: IconAsset;
    onPress: () => void;
};

/** Lets an Australian admin choose between paying through Expensify and exporting ABA files to pay from their own bank */
function AUReimbursementIntentPage({onPayViaExpensify, onPayViaABA}: AUReimbursementIntentPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const illustrations = useMemoizedLazyIllustrations(['BankCoin', 'MoneyReceipts']);

    const options: IntentOption[] = [
        {
            title: translate('bankAccount.abaWithdrawal.payViaExpensify'),
            description: translate('bankAccount.abaWithdrawal.payViaExpensifyDescription'),
            icon: illustrations.BankCoin,
            onPress: onPayViaExpensify,
        },
        {
            title: translate('bankAccount.abaWithdrawal.payViaABA'),
            description: translate('bankAccount.abaWithdrawal.payViaABADescription'),
            icon: illustrations.MoneyReceipts,
            onPress: onPayViaABA,
        },
    ];

    return (
        <FullPageOfflineBlockingView>
            <View style={styles.mh5}>
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mb6]}>{translate('bankAccount.abaWithdrawal.intentTitle')}</Text>
                {options.map((option) => (
                    <MenuItemRoot
                        key={option.title}
                        onPress={option.onPress}
                        accessibilityLabel={option.title}
                        style={styles.purposeMenuItem}
                    >
                        <MenuItemRow>
                            <MenuItemLeading>
                                {/* Illustrations keep their own colors, so they skip the tinted MenuItemIcon leaf */}
                                <Icon
                                    src={option.icon}
                                    width={variables.menuIconSize}
                                    height={variables.menuIconSize}
                                    additionalStyles={[styles.ml3, styles.mr2]}
                                />
                            </MenuItemLeading>
                            <MenuItemContent>
                                <MenuItemTitle>{option.title}</MenuItemTitle>
                                <MenuItemDescription>{option.description}</MenuItemDescription>
                            </MenuItemContent>
                            <MenuItemTrailing>
                                <MenuItemChevron />
                            </MenuItemTrailing>
                        </MenuItemRow>
                    </MenuItemRoot>
                ))}
            </View>
        </FullPageOfflineBlockingView>
    );
}

AUReimbursementIntentPage.displayName = 'AUReimbursementIntentPage';

export default AUReimbursementIntentPage;

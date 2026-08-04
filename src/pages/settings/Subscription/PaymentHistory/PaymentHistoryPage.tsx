import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';

import {useCurrencyListActions} from '@hooks/useCurrencyList';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import {buildQueryStringFromFilterFormValues} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import {format} from 'date-fns';
import React from 'react';
import {View} from 'react-native';

function PaymentHistoryPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {convertToDisplayString} = useCurrencyListActions();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['Receipt']);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [purchaseList] = useOnyx(ONYXKEYS.PURCHASE_LIST);

    const viewReceipts = () => {
        const query = buildQueryStringFromFilterFormValues({
            type: CONST.SEARCH.DATA_TYPES.EXPENSE,
            merchant: CONST.EXPENSIFY_MERCHANT,
            from: session?.accountID ? [session.accountID.toString()] : undefined,
            status: [
                CONST.SEARCH.STATUS.EXPENSE.UNREPORTED,
                CONST.SEARCH.STATUS.EXPENSE.DRAFTS,
                CONST.SEARCH.STATUS.EXPENSE.OUTSTANDING,
                CONST.SEARCH.STATUS.EXPENSE.APPROVED,
                CONST.SEARCH.STATUS.EXPENSE.DONE,
                CONST.SEARCH.STATUS.EXPENSE.PAID,
                CONST.SEARCH.STATUS.EXPENSE.DELETED,
            ],
        });

        Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query, rawQuery: query}));
    };

    return (
        <ScreenWrapper
            testID="PaymentHistoryPage"
            shouldShowOfflineIndicatorInWideScreen
        >
            <HeaderWithBackButton
                title={translate('subscription.paymentHistory.title')}
                onBackButtonPress={() => Navigation.goBack()}
            />
            <ScrollView contentContainerStyle={styles.flexGrow1}>
                <View style={styles.flex1}>
                    {(purchaseList ?? []).map((purchase) => {
                        const activeMemberCount = purchase.message.totalActorCount ?? purchase.message.paidActorCount;
                        return (
                            <MenuItemWithTopDescription
                                key={purchase.purchaseID}
                                description={format(new Date(purchase.created), CONST.DATE.MONTH_DAY_YEAR_ABBR_FORMAT)}
                                title={convertToDisplayString(purchase.amount, purchase.currency)}
                                hintText={activeMemberCount === undefined ? undefined : translate('subscription.paymentHistory.activeMembers', activeMemberCount)}
                                interactive={false}
                            />
                        );
                    })}
                    <MenuItem
                        shouldShowRightIcon
                        icon={expensifyIcons.Receipt}
                        title={translate('subscription.paymentHistory.viewReceipts')}
                        onPress={viewReceipts}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default PaymentHistoryPage;

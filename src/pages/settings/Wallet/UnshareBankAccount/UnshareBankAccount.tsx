import Button from '@components/ButtonComposed';
import ErrorMessageRow from '@components/ErrorMessageRow';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import BareUserListItem from '@components/SelectionList/ListItem/BareUserListItem';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';

import useConfirmModal from '@hooks/useConfirmModal';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {usePersonalDetailsByLogins} from '@hooks/usePersonalDetailByLogin';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {formatMemberForList, getHeaderMessage, getSearchValueForPhoneOrEmail} from '@libs/OptionsListUtils';
import tokenizedSearch from '@libs/tokenizedSearch';

import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';

import {clearUnshareBankAccountErrors, unshareBankAccount} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useEffectEvent} from 'react';
import {View} from 'react-native';

type ShareBankAccountProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.WALLET.UNSHARE_BANK_ACCOUNT>;

function UnshareBankAccount({route}: ShareBankAccountProps) {
    const bankAccountID = route.params?.bankAccountID;
    const styles = useThemeStyles();
    const [bankAccountList] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST);
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const [countryCode = CONST.DEFAULT_COUNTRY_CODE] = useOnyx(ONYXKEYS.COUNTRY_CODE);
    const [unsharedBankAccountData] = useOnyx(ONYXKEYS.UNSHARE_BANK_ACCOUNT);
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');
    const {showConfirmModal} = useConfirmModal();
    const isFocused = useIsFocused();
    const {translate} = useLocalize();
    const admins = bankAccountList?.[bankAccountID]?.accountData?.sharees;
    const totalAdmins = bankAccountList?.[bankAccountID]?.accountData?.sharees?.length;
    const adminEmails = admins?.filter((admin) => admin !== currentUserPersonalDetails?.email) ?? [];
    const adminPersonalDetails = usePersonalDetailsByLogins(adminEmails);
    const adminsWithInfo = adminEmails.map((admin) => {
        const personalDetails = adminPersonalDetails[admin];
        const formattedAdmin = formatMemberForList({
            text: personalDetails?.displayName,
            alternateText: personalDetails?.login,
            keyForList: personalDetails?.login ?? '',
            accountID: personalDetails?.accountID,
            login: personalDetails?.login,
            pendingAction: personalDetails?.pendingAction,
            reportID: '',
        });
        return {...formattedAdmin, isInteractive: false};
    });

    let adminsList = adminsWithInfo;
    if (debouncedSearchTerm) {
        const searchValue = getSearchValueForPhoneOrEmail(debouncedSearchTerm, countryCode).toLowerCase();
        adminsList = tokenizedSearch(adminsWithInfo, searchValue, (option) => [option.text ?? '', option.alternateText ?? '']);
    }

    const error = getLatestErrorMessage(bankAccountList?.[bankAccountID] ?? {});
    const isExpensifyCardError = error?.includes(CONST.EXPENSIFY_CARD.BANK);
    const isExpensifyCardSettlementAccount = bankAccountList?.[bankAccountID]?.isExpensifyCardSettlementAccount ?? false;
    const shouldShowTextInput = Number(totalAdmins) >= CONST.STANDARD_LIST_ITEM_LIMIT;
    const textInputLabel = shouldShowTextInput ? translate('common.search') : undefined;
    const isLoading = unsharedBankAccountData?.isLoading ?? false;
    const shouldShowSuccess = unsharedBankAccountData?.shouldShowSuccess ?? false;

    useEffect(() => {
        if (!shouldShowSuccess) {
            return;
        }
        if (!totalAdmins) {
            Navigation.goBack();
        }
    }, [totalAdmins, shouldShowSuccess]);

    const showCardErrorModal = useEffectEvent(() => {
        // The global modal wouldn't unmount with this RHP page, so when the page is no longer
        // focused just clear the errors instead of showing it.
        if (!isFocused) {
            clearUnshareBankAccountErrors(Number(bankAccountID));
            return;
        }
        showConfirmModal({
            title: translate('walletPage.unshareErrorModalTitle'),
            buttonVariant: CONST.BUTTON_VARIANT.SUCCESS,
            prompt: (
                <View style={[styles.renderHTML, styles.flexRow]}>
                    <RenderHTML html={translate('walletPage.reachOutForHelp')} />
                </View>
            ),
            confirmText: translate('common.buttonConfirm'),
            shouldShowCancelButton: false,
            shouldHandleNavigationBack: false,
        }).then(() => {
            // The wrapper makes a CLOSE exit (backdrop/ESC) reachable, so clear the errors on every
            // exit — otherwise isExpensifyCardError stays truthy and the modal could never re-show.
            clearUnshareBankAccountErrors(Number(bankAccountID));
        });
    });

    useEffect(() => {
        if (!isExpensifyCardError) {
            return;
        }
        showCardErrorModal();
    }, [isExpensifyCardError]);

    const handleUnshare = (login: string | null | undefined) => {
        if (!bankAccountID || !login) {
            return;
        }

        // Unsharing a bank account isn’t possible if the selected user’s copy of the bank account is set as an Expensify Card settlement account.
        if (isExpensifyCardSettlementAccount) {
            showCardErrorModal();
            return;
        }
        unshareBankAccount(Number(bankAccountID), login);
    };

    const itemRightSideComponent = (item: ListItem) => {
        const promptUnshare = () => {
            showConfirmModal({
                title: translate('common.areYouSure'),
                prompt: translate('walletPage.unshareBankAccountWarning', {admin: item?.text}),
                confirmText: translate('common.unshare'),
                cancelText: translate('common.cancel'),
                buttonVariant: CONST.BUTTON_VARIANT.DANGER,
            }).then((result) => {
                if (result.action !== ModalActions.CONFIRM) {
                    return;
                }
                handleUnshare(item?.login);
            });
        };
        const isUnshareButtonLoading = isLoading && unsharedBankAccountData?.email === item?.login;

        return (
            <Button
                isLoading={isUnshareButtonLoading}
                size={CONST.BUTTON_SIZE.SMALL}
                isDisabled={isLoading}
                variant={CONST.BUTTON_VARIANT.DANGER}
                onPress={promptUnshare}
            >
                <Button.KeyboardShortcut />
                <Button.Text>{translate('common.unshare')}</Button.Text>
            </Button>
        );
    };

    const onButtonPress = () => Navigation.goBack(ROUTES.SETTINGS_WALLET);

    const getHeaderSearchMessage = () => {
        const searchValue = debouncedSearchTerm.trim().toLowerCase();
        return getHeaderMessage(adminsList.length !== 0, false, searchValue, countryCode, false);
    };

    const headerMessage = getHeaderSearchMessage();

    return (
        <ScreenWrapper testID={UnshareBankAccount.displayName}>
            <HeaderWithBackButton
                title={translate('walletPage.unshareBankAccount')}
                onBackButtonPress={onButtonPress}
            />
            <>
                <Text style={[styles.ph5, styles.pb3]}>{translate('walletPage.unshareBankAccountDescription')}</Text>
                <SelectionList
                    textInputOptions={{
                        headerMessage,
                        value: searchTerm,
                        label: textInputLabel,
                        onChangeText: setSearchTerm,
                    }}
                    data={adminsList}
                    shouldShowListEmptyContent={false}
                    rightHandSideComponent={itemRightSideComponent}
                    footerContent={
                        <ErrorMessageRow
                            errors={isExpensifyCardError ? null : unsharedBankAccountData?.errors}
                            errorRowStyles={[styles.mv3]}
                            onDismiss={() => clearUnshareBankAccountErrors(Number(bankAccountID))}
                        />
                    }
                    onSelectRow={() => {}}
                    ListItem={BareUserListItem}
                />
            </>
        </ScreenWrapper>
    );
}

UnshareBankAccount.displayName = 'UnshareBankAccount';

export default UnshareBankAccount;

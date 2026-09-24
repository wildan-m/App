import DatePicker from '@components/DatePicker';
import DelegatorList from '@components/DelegatorList';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemAction from '@components/MenuItem/presets/MenuItemAction';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import VacationDelegateMenuItem from '@components/VacationDelegateMenuItem';

import useConfirmModal from '@hooks/useConfirmModal';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearDraftValues} from '@libs/actions/FormActions';
import {clearVacationDelegateError, deleteVacationDelegate, setVacationDelegate} from '@libs/actions/VacationDelegate';
import DateUtils from '@libs/DateUtils';
import isVacationDelegateExpired from '@libs/isVacationDelegateExpired';
import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/VacationDelegateForm';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import {useNavigation} from '@react-navigation/native';
import {format} from 'date-fns';
import React, {useRef, useState} from 'react';
import {View} from 'react-native';

/** The delegate stays active for the whole picked day, so it is cleared at the end of it */
const END_OF_DAY_TIME = '23:59:59';

function VacationDelegatePage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {login: currentUserLogin = ''} = useCurrentUserPersonalDetails();
    const {showConfirmModal} = useConfirmModal();
    const navigation = useNavigation();
    const icons = useMemoizedLazyExpensifyIcons(['Trashcan']);

    const [vacationDelegate, vacationDelegateMetadata] = useOnyx(ONYXKEYS.NVP_PRIVATE_VACATION_DELEGATE);
    const [draftDelegate] = useOnyx(ONYXKEYS.FORMS.VACATION_DELEGATE_FORM_DRAFT, {selector: (draft) => draft?.[INPUT_IDS.DELEGATE]});

    const isSavedDelegateActive = !!vacationDelegate?.delegate && !isVacationDelegateExpired(vacationDelegate?.clearAfter);
    const savedDelegate = isSavedDelegateActive ? vacationDelegate?.delegate : undefined;
    const savedClearAfter = isSavedDelegateActive ? vacationDelegate?.clearAfter : undefined;
    const delegate = draftDelegate ?? savedDelegate ?? '';
    const hasActiveDelegations = !!vacationDelegate?.delegatorFor?.length;

    const [clearAfterDate, setClearAfterDate] = useState(() => (savedClearAfter ? DateUtils.extractDate(savedClearAfter) : ''));

    const isSelectingRef = useRef(false);

    const goBack = () => {
        clearDraftValues(ONYXKEYS.FORMS.VACATION_DELEGATE_FORM);
        Navigation.goBack(ROUTES.SETTINGS_PROFILE.route);
    };

    const showErrorModal = async (delegateToRestore?: string, message?: string) => {
        await showConfirmModal({
            title: translate('statusPage.addVacationDelegate'),
            prompt: message ?? translate('statusPage.vacationDelegateError'),
            confirmText: translate('common.buttonConfirm'),
            shouldShowCancelButton: false,
        });

        clearVacationDelegateError(delegateToRestore);
    };

    const removeDelegate = () => {
        deleteVacationDelegate(vacationDelegate);
        goBack();
    };

    const onSubmit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.VACATION_DELEGATE_FORM>) => {
        if (isSelectingRef.current || !delegate) {
            return;
        }

        const pickedDate = values[INPUT_IDS.CLEAR_AFTER];
        const clearAfter = pickedDate ? `${pickedDate} ${END_OF_DAY_TIME}` : undefined;

        if (delegate === savedDelegate && clearAfter === savedClearAfter) {
            goBack();
            return;
        }

        isSelectingRef.current = true;
        const hasUnconfirmedChange = !!vacationDelegate?.pendingAction || !isEmptyObject(vacationDelegate?.errors) || !!vacationDelegate?.policyDiff;
        const currentDelegate = hasUnconfirmedChange ? vacationDelegate?.previousDelegate : vacationDelegate?.delegate;
        setVacationDelegate({creator: currentUserLogin, delegate, clearAfter, currentDelegate, currentClearAfter: vacationDelegate?.clearAfter})
            .then((response) => {
                if (!navigation.isFocused()) {
                    if (response?.data?.policyDiff) {
                        clearVacationDelegateError(currentDelegate);
                    }
                    return;
                }

                if (response?.data?.policyDiff) {
                    Navigation.navigate(ROUTES.SETTINGS_VACATION_DELEGATE_MISSING_WORKSPACES);
                    return;
                }

                // The action leaves the failure on the NVP for the profile page's red brick road, but the user is still on this screen,
                // so report it where they are. Dismissing the modal restores the previous delegate, exactly as dismissing that error would.
                if (response?.jsonCode !== CONST.JSON_CODE.SUCCESS) {
                    showErrorModal(currentDelegate, response?.jsonCode === CONST.JSON_CODE.EXP_ERROR ? response.message : undefined);
                    return;
                }

                goBack();
            })
            .catch(() => {
                if (!navigation.isFocused()) {
                    clearVacationDelegateError(currentDelegate);
                    return;
                }

                showErrorModal(currentDelegate);
            })
            .finally(() => {
                isSelectingRef.current = false;
            });
    };

    if (isLoadingOnyxValue(vacationDelegateMetadata)) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom
            testID="VacationDelegatePage"
            shouldShowOfflineIndicator={false}
        >
            <HeaderWithBackButton
                title={translate('common.vacationDelegate')}
                onBackButtonPress={goBack}
            />
            {hasActiveDelegations ? (
                <DelegatorList
                    delegators={vacationDelegate?.delegatorFor}
                    message={translate('statusPage.cannotSetVacationDelegate')}
                />
            ) : (
                <FormProvider
                    style={[styles.flexGrow1]}
                    formID={ONYXKEYS.FORMS.VACATION_DELEGATE_FORM}
                    onSubmit={onSubmit}
                    submitButtonText={translate('common.save')}
                    submitButtonStyles={styles.ph5}
                    isSubmitDisabled={!delegate}
                    enabledWhenOffline
                    shouldHideFixErrorsAlert
                >
                    <Text style={[styles.mh5, styles.mb4]}>{translate('statusPage.setVacationDelegate')}</Text>
                    <VacationDelegateMenuItem
                        vacationDelegate={{delegate}}
                        label={translate('statusPage.chooseDelegate')}
                        onCloseError={() => {}}
                        onPress={() => Navigation.navigate(ROUTES.SETTINGS_VACATION_DELEGATE_SELECT)}
                    />
                    <View style={[styles.mh5, styles.mt4]}>
                        <InputWrapper
                            InputComponent={DatePicker}
                            inputID={INPUT_IDS.CLEAR_AFTER}
                            label={translate('statusPage.vacationDelegateClearAfter')}
                            defaultValue={clearAfterDate}
                            minDate={new Date()}
                            onValueChange={(value) => setClearAfterDate(typeof value === 'string' ? value : '')}
                        />
                        {!!clearAfterDate && (
                            <Text style={[styles.textLabelSupporting, styles.mt2]}>
                                {translate('statusPage.vacationDelegateWillClearOn', format(new Date(`${clearAfterDate}T00:00:00`), CONST.DATE.MONTH_DAY_YEAR_ABBR_FORMAT))}
                            </Text>
                        )}
                    </View>
                    {!!savedDelegate && (
                        <View style={styles.mt4}>
                            <MenuItemAction
                                title={translate('common.remove')}
                                icon={icons.Trashcan}
                                onPress={removeDelegate}
                            />
                        </View>
                    )}
                </FormProvider>
            )}
        </ScreenWrapper>
    );
}

export default VacationDelegatePage;

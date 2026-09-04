import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {addErrorMessage} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {canAdminSetMemberDisplayName} from '@libs/PolicyUtils';
import {doesContainReservedWord, isRequiredFulfilled, isValidDisplayName} from '@libs/ValidationUtils';

import type {ProfileNavigatorParamList} from '@navigation/types';

import {updateMemberDisplayName} from '@userActions/PersonalDetails';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/DisplayNameForm';

import React from 'react';
import {View} from 'react-native';

type MemberDisplayNamePageProps = PlatformStackScreenProps<ProfileNavigatorParamList, typeof SCREENS.DYNAMIC_PROFILE_DISPLAY_NAME>;

function MemberDisplayNamePage({route}: MemberDisplayNamePageProps) {
    const styles = useThemeStyles();
    const {translate, formatPhoneNumber} = useLocalize();
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const {login: currentUserLogin} = useCurrentUserPersonalDetails();

    const accountID = Number(route.params?.accountID ?? CONST.DEFAULT_NUMBER_ID);
    const memberDetails = personalDetails?.[accountID] ?? undefined;
    const canEditDisplayName = canAdminSetMemberDisplayName(memberDetails, currentUserLogin, policies);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MEMBER_DISPLAY_NAME_FORM>) => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.MEMBER_DISPLAY_NAME_FORM> = {};

        // First we validate the first name field
        if (!isValidDisplayName(values.firstName)) {
            addErrorMessage(errors, 'firstName', translate('personalDetails.error.hasInvalidCharacter'));
        } else if (values.firstName.length > CONST.DISPLAY_NAME.MAX_LENGTH) {
            addErrorMessage(errors, 'firstName', translate('common.error.characterLimitExceedCounter', values.firstName.length, CONST.DISPLAY_NAME.MAX_LENGTH));
        } else if (!isRequiredFulfilled(values.firstName)) {
            addErrorMessage(errors, 'firstName', translate('personalDetails.error.requiredFirstName'));
        }
        if (doesContainReservedWord(values.firstName, CONST.DISPLAY_NAME.RESERVED_NAMES)) {
            addErrorMessage(errors, 'firstName', translate('personalDetails.error.containsReservedWord'));
        }

        // Then we validate the last name field
        if (!isValidDisplayName(values.lastName)) {
            addErrorMessage(errors, 'lastName', translate('personalDetails.error.hasInvalidCharacter'));
        } else if (values.lastName.length > CONST.DISPLAY_NAME.MAX_LENGTH) {
            addErrorMessage(errors, 'lastName', translate('common.error.characterLimitExceedCounter', values.lastName.length, CONST.DISPLAY_NAME.MAX_LENGTH));
        }
        if (doesContainReservedWord(values.lastName, CONST.DISPLAY_NAME.RESERVED_NAMES)) {
            addErrorMessage(errors, 'lastName', translate('personalDetails.error.containsReservedWord'));
        }
        return errors;
    };

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MEMBER_DISPLAY_NAME_FORM>) => {
        updateMemberDisplayName(values.firstName.trim(), values.lastName.trim(), formatPhoneNumber, {
            accountID,
            email: memberDetails?.login ?? '',
            firstName: memberDetails?.firstName ?? '',
            lastName: memberDetails?.lastName ?? '',
            displayName: memberDetails?.displayName ?? '',
            avatar: memberDetails?.avatar ?? '',
        });
        Navigation.goBack();
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom
            shouldEnableMaxHeight
            testID="MemberDisplayNamePage"
        >
            <FullPageNotFoundView shouldShow={!canEditDisplayName}>
                <HeaderWithBackButton
                    title={translate('displayNamePage.headerTitle')}
                    onBackButtonPress={() => Navigation.goBack()}
                />
                <FormProvider
                    style={[styles.flexGrow1, styles.ph5]}
                    formID={ONYXKEYS.FORMS.MEMBER_DISPLAY_NAME_FORM}
                    validate={validate}
                    onSubmit={submit}
                    submitButtonText={translate('common.save')}
                    enabledWhenOffline
                    shouldValidateOnBlur
                    shouldValidateOnChange
                >
                    <Text style={[styles.mb6]}>{translate('displayNamePage.isShownOnMemberProfile')}</Text>
                    <View style={styles.mb4}>
                        <InputWrapper
                            InputComponent={TextInput}
                            inputID={INPUT_IDS.FIRST_NAME}
                            name="fname"
                            label={translate('common.firstName')}
                            aria-label={translate('common.firstName')}
                            role={CONST.ROLE.PRESENTATION}
                            defaultValue=""
                            spellCheck={false}
                            autoCapitalize="words"
                            autoComplete="given-name"
                        />
                    </View>
                    <View>
                        <InputWrapper
                            InputComponent={TextInput}
                            inputID={INPUT_IDS.LAST_NAME}
                            name="lname"
                            label={translate('common.lastName')}
                            aria-label={translate('common.lastName')}
                            role={CONST.ROLE.PRESENTATION}
                            defaultValue=""
                            spellCheck={false}
                            autoCapitalize="words"
                            autoComplete="family-name"
                        />
                    </View>
                </FormProvider>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

MemberDisplayNamePage.displayName = 'MemberDisplayNamePage';

export default MemberDisplayNamePage;

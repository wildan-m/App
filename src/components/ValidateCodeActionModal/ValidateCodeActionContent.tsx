import React, {useCallback, useEffect, useRef} from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ValidateCodeActionContentProps} from './type';
import ValidateCodeForm from './ValidateCodeForm';
import type {ValidateCodeFormHandle} from './ValidateCodeForm/BaseValidateCodeForm';

function ValidateCodeActionContent({
    title,
    descriptionPrimary,
    descriptionSecondary,
    onClose,
    validateError,
    validatePendingAction,
    validateCodeActionErrorField,
    handleSubmitForm,
    clearError,
    sendValidateCode,
    isLoading,
    threeDotsMenuItems = [],
    onThreeDotsButtonPress = () => {},
    isPageModal = true,
}: ValidateCodeActionContentProps) {
    const themeStyles = useThemeStyles();
    const validateCodeFormRef = useRef<ValidateCodeFormHandle>(null);
    const [validateCodeAction] = useOnyx(ONYXKEYS.VALIDATE_ACTION_CODE);
    const firstRenderRef = useRef(true);

    useEffect(() => {
        // De-dupe the auto-send across reloads using the time the code was last requested rather than a sticky global flag:
        // re-send on a genuinely fresh open (or state older than the resend window), but suppress a duplicate send on a reload that happens within the window.
        const lastRequestedAt = validateCodeAction?.validateCodeRequestedAt;
        const isWithinResendWindow = !!lastRequestedAt && Date.now() - lastRequestedAt < CONST.REQUEST_CODE_DELAY * 1000;
        if (!firstRenderRef.current || isWithinResendWindow) {
            return;
        }
        firstRenderRef.current = false;

        sendValidateCode();
        // We only want to send validate code on first render not on change of the request timestamp, so we don't add it as a dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendValidateCode]);

    const hide = useCallback(() => {
        clearError();
        onClose?.();
    }, [onClose, clearError]);

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom
            includePaddingTop
            shouldEnableMaxHeight
            testID="ValidateCodeActionContent"
            offlineIndicatorStyle={themeStyles.mtAuto}
            shouldShowOfflineIndicatorInWideScreen
        >
            <HeaderWithBackButton
                title={title}
                onBackButtonPress={hide}
                threeDotsMenuItems={threeDotsMenuItems}
                shouldShowThreeDotsButton={threeDotsMenuItems.length > 0}
                shouldOverlayDots
                onThreeDotsButtonPress={onThreeDotsButtonPress}
            />

            <ScrollView
                style={[themeStyles.w100, themeStyles.h100, themeStyles.flex1]}
                contentContainerStyle={themeStyles.flexGrow1}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[themeStyles.ph5, themeStyles.mt3, themeStyles.mb5, themeStyles.flex1]}>
                    <Text style={themeStyles.mb3}>{descriptionPrimary}</Text>
                    {!!descriptionSecondary && <Text style={themeStyles.mb3}>{descriptionSecondary}</Text>}
                    <ValidateCodeForm
                        isLoading={isLoading}
                        validatePendingAction={validatePendingAction}
                        validateCodeActionErrorField={validateCodeActionErrorField}
                        validateError={validateError}
                        handleSubmitForm={handleSubmitForm}
                        sendValidateCode={sendValidateCode}
                        clearError={clearError}
                        buttonStyles={[themeStyles.justifyContentEnd, themeStyles.flex1]}
                        ref={validateCodeFormRef}
                        isInPageModal={isPageModal}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default ValidateCodeActionContent;

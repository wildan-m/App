import React, {useCallback} from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {setDraftValues} from '@libs/actions/FormActions';
import DateUtils from '@libs/DateUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {hasAccountingConnections} from '@libs/PolicyUtils';
import type {SettingsNavigatorParamList} from '@navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import type {ReportFieldItemType} from '@pages/workspace/reports/ReportFieldTypePicker';
import ReportFieldTypePicker from '@pages/workspace/reports/ReportFieldTypePicker';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceReportFieldForm';
import type {PolicyReportFieldType} from '@src/types/onyx/Policy';

type WorkspaceReportFieldsTypeSelectorPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.REPORT_FIELDS_TYPE_SELECTOR>;

function getInitialValueForType(type: PolicyReportFieldType): string {
    if (type === CONST.REPORT_FIELD_TYPES.DATE) {
        return DateUtils.extractDate(new Date().toString());
    }
    if (type === CONST.REPORT_FIELD_TYPES.FORMULA) {
        return '{report:id}';
    }
    return '';
}

function WorkspaceReportFieldsTypeSelectorPage({
    route: {
        params: {policyID},
    },
}: WorkspaceReportFieldsTypeSelectorPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [formDraft] = useOnyx(ONYXKEYS.FORMS.WORKSPACE_REPORT_FIELDS_FORM_DRAFT);
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);

    const currentType = (formDraft?.[INPUT_IDS.TYPE] as PolicyReportFieldType) ?? CONST.REPORT_FIELD_TYPES.TEXT;

    const handleTypeSelected = useCallback((reportField: ReportFieldItemType) => {
        setDraftValues(ONYXKEYS.FORMS.WORKSPACE_REPORT_FIELDS_FORM, {
            [INPUT_IDS.TYPE]: reportField.value,
            [INPUT_IDS.INITIAL_VALUE]: getInitialValueForType(reportField.value),
        });
        Navigation.goBack();
    }, []);

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_REPORT_FIELDS_ENABLED}
            shouldBeBlocked={hasAccountingConnections(policy)}
        >
            <ScreenWrapper
                style={styles.pb0}
                includePaddingTop={false}
                enableEdgeToEdgeBottomSafeAreaPadding
                testID={WorkspaceReportFieldsTypeSelectorPage.displayName}
            >
                <HeaderWithBackButton
                    title={translate('common.type')}
                    onBackButtonPress={Navigation.goBack}
                />
                <View style={[styles.ph5, styles.pb4]}>
                    <Text style={[styles.sidebarLinkText, styles.optionAlternateText]}>{translate('workspace.reportFields.typeInputSubtitle')}</Text>
                </View>
                <ReportFieldTypePicker
                    defaultValue={currentType}
                    onOptionSelected={handleTypeSelected}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceReportFieldsTypeSelectorPage.displayName = 'WorkspaceReportFieldsTypeSelectorPage';

export default WorkspaceReportFieldsTypeSelectorPage;

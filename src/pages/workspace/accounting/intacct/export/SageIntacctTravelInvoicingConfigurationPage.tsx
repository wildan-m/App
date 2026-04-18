import {useRoute} from '@react-navigation/native';
import React from 'react';
import type {ValueOf} from 'type-fest';
import ConnectionLayout from '@components/ConnectionLayout';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import useLocalize from '@hooks/useLocalize';
import usePolicy from '@hooks/usePolicy';
import useThemeStyles from '@hooks/useThemeStyles';
import type {PlatformStackRouteProp} from '@libs/Navigation/PlatformStackNavigation/types';
import {areSettingsInErrorFields, settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import type {SettingsNavigatorParamList} from '@navigation/types';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {Errors, PendingAction} from '@src/types/onyx/OnyxCommon';

type SageIntacctSectionType = {
    title?: string;
    description?: string;
    onPress: () => void;
    errorText?: string;
    hintText?: string;
    subscribedSettings: string[];
    pendingAction?: PendingAction;
    errors?: Errors;
    brickRoadIndicator?: ValueOf<typeof CONST.BRICK_ROAD_INDICATOR_STATUS>;
};

const vendor = [CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR];
const payableAccount = [CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT];

function SageIntacctTravelInvoicingConfigurationPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const route = useRoute<PlatformStackRouteProp<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_TRAVEL_INVOICING_CONFIGURATION>>();
    const policyID = route.params.policyID;
    const policy = usePolicy(policyID);
    const intacctConfig = policy?.connections?.intacct?.config;

    const {vendors, bankAccounts} = policy?.connections?.intacct?.data ?? {};
    const travelVendor = vendors?.find((v) => v.id === intacctConfig?.travelInvoicingVendorID);
    const travelPayableAccount = bankAccounts?.find((a) => a.id === intacctConfig?.travelInvoicingPayableAccountID);

    const sections: SageIntacctSectionType[] = [
        {
            title: travelVendor?.value,
            description: translate('workspace.sageIntacct.travelInvoicingVendor'),
            onPress: () => {
                Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_VENDOR_SELECT.getRoute(policyID));
            },
            subscribedSettings: vendor,
            pendingAction: settingsPendingAction(vendor, intacctConfig?.pendingFields),
            brickRoadIndicator: areSettingsInErrorFields(vendor, intacctConfig?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
        },
        {
            title: travelPayableAccount?.name,
            description: translate('workspace.sageIntacct.travelInvoicingPayableAccount'),
            onPress: () => {
                Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_PAYABLE_ACCOUNT_SELECT.getRoute(policyID));
            },
            subscribedSettings: payableAccount,
            pendingAction: settingsPendingAction(payableAccount, intacctConfig?.pendingFields),
            brickRoadIndicator: areSettingsInErrorFields(payableAccount, intacctConfig?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
        },
    ];

    return (
        <ConnectionLayout
            displayName="SageIntacctTravelInvoicingConfigurationPage"
            headerTitle="workspace.sageIntacct.travelInvoicing"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={styles.pb2}
            titleStyle={styles.ph5}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            onBackButtonPress={() => Navigation.goBack(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_EXPORT.getRoute(policyID))}
        >
            {sections.map((section) => (
                <OfflineWithFeedback
                    pendingAction={section.pendingAction}
                    key={section.subscribedSettings.at(0)}
                    errors={section.errors}
                    errorRowStyles={[styles.ph5]}
                >
                    <MenuItemWithTopDescription
                        title={section.title}
                        description={section.description}
                        onPress={section.onPress}
                        shouldShowRightIcon
                        brickRoadIndicator={section.brickRoadIndicator}
                        hintText={section.hintText}
                    />
                </OfflineWithFeedback>
            ))}
        </ConnectionLayout>
    );
}

export default SageIntacctTravelInvoicingConfigurationPage;

import UserAvatar from '@components/Avatar/UserAvatar';
import Badge from '@components/Badge';
import Button from '@components/Button';
import ButtonDisabledWhenOffline from '@components/Button/composed/ButtonDisabledWhenOffline';
import CollapsibleHeaderOnKeyboard from '@components/CollapsibleHeaderOnKeyboard';
import FixedFooter from '@components/FixedFooter';
import FormHelpMessage from '@components/FormHelpMessage';
import Icon from '@components/Icon';
import type {ExpensifyIconName} from '@components/Icon/ExpensifyIconLoader';
import OnboardingHeader from '@components/OnboardingHeader';
import type {AnimatedTextInputRef} from '@components/RNTextInput';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import type {ListItem} from '@components/SelectionList/ListItem/types';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useCompleteOnboarding from '@hooks/useCompleteOnboarding';
import useDebouncedState from '@hooks/useDebouncedState';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import {setOnboardingAccountingEnabled, setOnboardingAdminsChatReportID, setOnboardingPolicyID, setOnboardingUserReportedIntegration} from '@libs/actions/Welcome';
import {getDefaultOnboardingFeaturesMap} from '@libs/actions/Welcome/OnboardingFeatures';
import {isMobileSafari} from '@libs/Browser';
import Navigation from '@libs/Navigation/Navigation';
import {isGroupPolicy, isPolicyAdmin} from '@libs/PolicyUtils';
import StringUtils from '@libs/StringUtils';

import variables from '@styles/variables';

import type {OnboardingAccounting, OnboardingAccountingComingSoonOption, OnboardingAccountingOption} from '@src/CONST';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import ObjectUtils from '@src/types/utils/ObjectUtils';

import type {TupleToUnion} from 'type-fest';

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import type {BaseOnboardingAccountingProps} from './types';

type AccountingIntegrationKey = Exclude<OnboardingAccountingOption, 'other'>;

type AccountingOptionKey = OnboardingAccountingOption | OnboardingAccountingComingSoonOption;

type AccountingListItem = ListItem & {
    optionKey: AccountingOptionKey;
};

/** Icon for each available option in `CONST.ONBOARDING_ACCOUNTING_MAPPING`. `satisfies` keeps the keys in sync. */
const integrationIcons = {
    quickbooksOnline: 'QBOCircle',
    intuitEnterpriseSuite: 'IntuitSquare',
    quickbooksDesktop: 'QBDSquare',
    xero: 'XeroCircle',
    netsuite: 'NetSuiteSquare',
    intacct: 'IntacctSquare',
    financialforce: 'CertiniaSquare',
    rillet: 'RilletSquare',
    dualEntry: 'DualEntrySquare',
    campfire: 'CampfireSquare',
    sap: 'SapSquare',
    oracle: 'OracleSquare',
    microsoftDynamics: 'MicrosoftDynamicsSquare',
} satisfies Record<AccountingIntegrationKey, ExpensifyIconName>;

/** Icon for each option in `CONST.ONBOARDING_ACCOUNTING_COMING_SOON_MAPPING`. `satisfies` keeps the keys in sync. */
const comingSoonIntegrationIcons = {
    exactOnline: 'ExactOnlineSquare',
    zohoBooks: 'ZohoBooksSquare',
    digits: 'DigitsSquare',
    businessCentral: 'BusinessCentralSquare',
} satisfies Record<OnboardingAccountingComingSoonOption, ExpensifyIconName>;

const integrationKeys = ObjectUtils.typedKeys(integrationIcons);

const comingSoonKeys = ObjectUtils.typedKeys(comingSoonIntegrationIcons);

const allIconNames = [...integrationKeys.map((key) => integrationIcons[key]), ...comingSoonKeys.map((key) => comingSoonIntegrationIcons[key])];

function isIntegrationKey(integrationKey: OnboardingAccounting | undefined): integrationKey is AccountingIntegrationKey {
    return integrationKeys.some((key) => key === integrationKey);
}

function isComingSoonKey(integrationKey: OnboardingAccounting | undefined): integrationKey is OnboardingAccountingComingSoonOption {
    return comingSoonKeys.some((key) => key === integrationKey);
}

function BaseOnboardingAccounting({shouldUseNativeStyles}: BaseOnboardingAccountingProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const expensifyIcons = useMemoizedLazyExpensifyIcons(allIconNames);
    const illustrations = useMemoizedLazyIllustrations(['Pencil']);
    const {onboardingIsMediumOrLargerScreenWidth} = useResponsiveLayout();
    const [onboardingPolicyID] = useOnyx(ONYXKEYS.ONBOARDING_POLICY_ID);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [onboardingUserReportedIntegration] = useOnyx(ONYXKEYS.ONBOARDING_USER_REPORTED_INTEGRATION);
    const [onboardingFeaturesMap] = useOnyx(ONYXKEYS.ONBOARDING_INTERESTED_FEATURES_MAP);

    let initialSelectedIntegration: AccountingOptionKey | undefined;
    if (isIntegrationKey(onboardingUserReportedIntegration) || isComingSoonKey(onboardingUserReportedIntegration)) {
        initialSelectedIntegration = onboardingUserReportedIntegration;
    } else if (onboardingUserReportedIntegration) {
        initialSelectedIntegration = 'other';
    }
    const [selectedIntegration, setSelectedIntegration] = useState<AccountingOptionKey | undefined>(initialSelectedIntegration);
    const [userReportedIntegrationName, setUserReportedIntegrationName] = useState('');
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');
    const [error, setError] = useState('');
    const otherAccountingSoftwareInputRef = useRef<AnimatedTextInputRef | null>(null);
    const isOtherSelected = selectedIntegration === 'other';

    const groupPolicy = Object.values(allPolicies ?? {}).find((policy) => isGroupPolicy(policy) && isPolicyAdmin(policy, session?.email));
    const {completeOnboardingFlow, isLoading: isCompletingOnboarding} = useCompleteOnboarding();

    // Set onboardingPolicyID and onboardingAdminsChatReportID if a workspace is created by the backend for OD signup
    useEffect(() => {
        if (!groupPolicy || onboardingPolicyID) {
            return;
        }
        setOnboardingAdminsChatReportID(groupPolicy.chatReportIDAdmins?.toString());
        setOnboardingPolicyID(groupPolicy.id);
    }, [groupPolicy, onboardingPolicyID]);

    const submitAccounting = async (integrationOverride?: AccountingOptionKey, integrationNameOverride?: string) => {
        const integration = integrationOverride ?? selectedIntegration;
        if (!integration) {
            setError(translate('onboarding.errorSelection'));
            return;
        }

        const integrationValue: OnboardingAccounting = integration;
        const trimmedIntegrationName = (integrationNameOverride ?? userReportedIntegrationName).trim();
        const integrationName = integrationValue === 'other' && trimmedIntegrationName ? trimmedIntegrationName : undefined;
        setOnboardingAccountingEnabled(true);
        setOnboardingUserReportedIntegration(integrationValue);
        await completeOnboardingFlow({
            featuresMap: onboardingFeaturesMap ?? getDefaultOnboardingFeaturesMap(),
            userReportedIntegration: integrationValue,
            userReportedIntegrationName: integrationName,
        });
    };

    const handleIntegrationSelect = (integrationKey: AccountingOptionKey) => {
        if (integrationKey === 'other' && isOtherSelected) {
            otherAccountingSoftwareInputRef.current?.focus();
            setError('');
            return;
        }

        setSelectedIntegration(integrationKey);
        if (integrationKey !== 'other') {
            setUserReportedIntegrationName('');
        }
        setError('');
    };

    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const sanitizedSearchTerm = StringUtils.sanitizeString(trimmedSearchTerm);

    const buildOptionAvatar = (iconName: TupleToUnion<typeof allIconNames>) => (
        <View style={styles.mr3}>
            <UserAvatar
                source={expensifyIcons[iconName]}
                size={CONST.AVATAR_SIZE.SMALL}
                accountID={CONST.DEFAULT_NUMBER_ID}
            />
        </View>
    );

    const comingSoonLabel = translate('onboarding.accounting.comingSoon');
    const allOptions: AccountingListItem[] = [
        ...integrationKeys.map((integrationKey) => ({
            optionKey: integrationKey,
            keyForList: integrationKey,
            text: CONST.ONBOARDING_ACCOUNTING_MAPPING[integrationKey],
            isSelected: selectedIntegration === integrationKey,
            leftElement: buildOptionAvatar(integrationIcons[integrationKey]),
        })),
        ...comingSoonKeys.map((integrationKey) => ({
            optionKey: integrationKey,
            keyForList: integrationKey,
            text: CONST.ONBOARDING_ACCOUNTING_COMING_SOON_MAPPING[integrationKey],
            isSelected: selectedIntegration === integrationKey,
            leftElement: buildOptionAvatar(comingSoonIntegrationIcons[integrationKey]),
            rightElement: (
                <Badge
                    text={comingSoonLabel}
                    isCondensed
                />
            ),
        })),
        {
            optionKey: 'other',
            keyForList: 'other',
            text: translate('workspace.accounting.other'),
            isSelected: isOtherSelected,
            leftElement: (
                <View style={styles.mr3}>
                    <Icon
                        src={illustrations.Pencil}
                        width={variables.iconSizeXLarge}
                        height={variables.iconSizeXLarge}
                    />
                </View>
            ),
        },
    ];

    const filteredOptions = sanitizedSearchTerm ? allOptions.filter((option) => StringUtils.sanitizeString(option.text ?? '').includes(sanitizedSearchTerm)) : allOptions;
    const shouldShowEmptyState = filteredOptions.length === 0 && !!trimmedSearchTerm;

    const handleExpressInterest = () => {
        setSelectedIntegration('other');
        setUserReportedIntegrationName(trimmedSearchTerm);
        submitAccounting('other', trimmedSearchTerm);
    };

    const listEmptyContent = (
        <View style={[styles.ph5, styles.pt3]}>
            <Text style={styles.textStrong}>{translate('onboarding.accounting.emptyStateTitle', {softwareName: trimmedSearchTerm})}</Text>
            <Text style={[styles.textSupporting, styles.mt1, styles.mb4]}>{translate('onboarding.accounting.emptyStateSubtitle')}</Text>
            <ButtonDisabledWhenOffline
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                size={CONST.BUTTON_SIZE.MEDIUM}
                onPress={handleExpressInterest}
                isLoading={isCompletingOnboarding}
                sentryLabel={CONST.SENTRY_LABEL.ONBOARDING.ACCOUNTING_EXPRESS_INTEREST}
                style={styles.alignSelfStart}
            >
                <Button.Text>{translate('onboarding.accounting.expressInterest')}</Button.Text>
            </ButtonDisabledWhenOffline>
        </View>
    );

    const continueButton = (
        <>
            {!!error && (
                <FormHelpMessage
                    style={[styles.ph1, styles.mb2]}
                    isError
                    message={error}
                />
            )}

            <ButtonDisabledWhenOffline
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                size={CONST.BUTTON_SIZE.LARGE}
                onPress={() => submitAccounting()}
                isLoading={isCompletingOnboarding}
                sentryLabel={CONST.SENTRY_LABEL.ONBOARDING.CONTINUE}
            >
                <Button.KeyboardShortcut />
                <Button.Text>{translate('common.continue')}</Button.Text>
            </ButtonDisabledWhenOffline>
        </>
    );

    return (
        <ScreenWrapper
            testID="BaseOnboardingAccounting"
            style={[styles.defaultModalContainer, shouldUseNativeStyles && styles.pt8]}
            shouldEnableMaxHeight={!isMobileSafari()}
            shouldAvoidScrollOnVirtualViewport={!isMobileSafari()}
        >
            <CollapsibleHeaderOnKeyboard>
                <OnboardingHeader
                    onBackButtonPress={() => Navigation.goBack(ROUTES.ONBOARDING_INTERESTED_FEATURES.getRoute())}
                    shouldCollapseOnKeyboard
                />
                <View style={[onboardingIsMediumOrLargerScreenWidth && styles.mt5, onboardingIsMediumOrLargerScreenWidth ? styles.mh8 : styles.mh5]}>
                    <Text
                        style={[styles.textHeadlineH1, styles.mb5]}
                        accessibilityRole={CONST.ROLE.HEADER}
                    >
                        {translate('onboarding.accounting.title')}
                    </Text>
                </View>
            </CollapsibleHeaderOnKeyboard>
            <View style={[styles.flex1, onboardingIsMediumOrLargerScreenWidth && styles.mh3]}>
                <SelectionList
                    data={filteredOptions}
                    ListItem={SingleSelectListItem}
                    onSelectRow={(item) => handleIntegrationSelect(item.optionKey)}
                    textInputOptions={{
                        label: translate('onboarding.accounting.searchPlaceholder'),
                        value: searchTerm,
                        onChangeText: setSearchTerm,
                        disableAutoFocus: true,
                    }}
                    searchValueForFocusSync={debouncedSearchTerm}
                    initiallyFocusedItemKey={selectedIntegration}
                    shouldSingleExecuteRowSelect
                    shouldUpdateFocusedIndex
                    listEmptyContent={listEmptyContent}
                    shouldShowListEmptyContent={shouldShowEmptyState}
                />
            </View>
            {isOtherSelected && (
                <View style={[onboardingIsMediumOrLargerScreenWidth ? styles.mh8 : styles.mh5, styles.mb3]}>
                    <TextInput
                        ref={otherAccountingSoftwareInputRef}
                        accessibilityLabel={translate('onboarding.accounting.otherAccountingSoftware')}
                        label={translate('onboarding.accounting.otherAccountingSoftware')}
                        value={userReportedIntegrationName}
                        onChangeText={setUserReportedIntegrationName}
                        autoFocus
                    />
                </View>
            )}
            <FixedFooter style={[styles.pt3, styles.ph5]}>{continueButton}</FixedFooter>
        </ScreenWrapper>
    );
}

export default BaseOnboardingAccounting;

import React from 'react';
import {View} from 'react-native';
import GenericEmptyStateComponent from '@components/EmptyStateComponent/GenericEmptyStateComponent';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import type {DomainMemberTableRowData} from '@components/Tables/DomainMembersTable';
import DomainMembersTable from '@components/Tables/DomainMembersTable';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useShouldDisplayButtonsInSeparateLine from '@hooks/useShouldDisplayButtonsInSeparateLine';
import useThemeStyles from '@hooks/useThemeStyles';
import {getLatestError} from '@libs/ErrorUtils';
import {getDisplayNameOrDefault} from '@libs/PersonalDetailsUtils';
import type {BrickRoad} from '@libs/WorkspacesSettingsUtils';
import Navigation from '@navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Errors, PendingAction} from '@src/types/onyx/OnyxCommon';
import type IconAsset from '@src/types/utils/IconAsset';
import DomainNotFoundPageWrapper from './DomainNotFoundPageWrapper';

/** The minimal member shape passed back to consumer callbacks (row selection, error dismissal, group pre-filter). */
type MemberOption = {
    /** A unique identifier for the row */
    keyForList: string;

    /** Member accountID */
    accountID: number;

    /** Member login */
    login: string;

    /** Member display name */
    text?: string;

    /** Member login shown as secondary text */
    alternateText?: string;

    /** The pending action for the member */
    pendingAction?: PendingAction;
};

type BaseDomainMembersPageProps = {
    /** The ID of the domain used for the not found wrapper */
    domainAccountID: number;

    /** The list of accountIDs to display */
    accountIDs: number[];

    /** The title of the header */
    headerTitle: string;

    /** Label shown in the member column header */
    memberColumnLabel: string;

    /** Label shown in the group column header. When provided, a group column is rendered. */
    groupColumnLabel?: string;

    /** Placeholder text for the search bar */
    searchPlaceholder: string;

    /** Content to display in the header (e.g., Add/Settings buttons) */
    headerContent?: React.ReactNode;

    /** Callback fired when a row is selected */
    onSelectRow: (item: MemberOption) => void;

    /** Icon displayed in the header of the tab */
    headerIcon?: IconAsset;

    /** Function to render a custom right element for a row */
    getCustomRightElement?: (accountID: number) => React.ReactNode;

    /** Function to return additional row-specific properties like errors or pending actions */
    getCustomRowProps?: (accountID: number, accountEmail?: string) => {errors?: Errors; pendingAction?: PendingAction; brickRoadIndicator?: BrickRoad};

    /** Callback fired when the user dismisses an error message for a specific row */
    onDismissError?: (item: MemberOption) => void;

    /** Allow multiple members to be selected at the same time. Defaults to false. */
    canSelectMultiple?: boolean;

    /** Stores list of selected members. Only works with canSelectMultiple === true. */
    selectedMembers?: string[];

    /** Setter for a list of selected members. Only works with canSelectMultiple === true. */
    setSelectedMembers?: React.Dispatch<React.SetStateAction<string[]>>;

    /** Whether the selection mode header should be shown (changes title and hides icon) */
    useSelectionModeHeader?: boolean;

    /** Custom back button press handler */
    onBackButtonPress?: () => void;

    /** Optional accessory element to display next to the search bar (e.g., filter dropdown) */
    searchBarAccessory?: React.ReactNode;

    /** Optional filter applied unconditionally before text search (e.g. group filter). */
    preFilter?: (item: MemberOption) => boolean;

    /** Title to show in the empty state when the list has no items */
    emptyStateTitle?: string;

    /** Subtitle to show in the empty state when the list has no items */
    emptyStateSubtitle?: string;
};

function BaseDomainMembersPage({
    domainAccountID,
    accountIDs,
    headerTitle,
    memberColumnLabel,
    groupColumnLabel,
    searchPlaceholder,
    headerContent,
    onSelectRow,
    headerIcon,
    getCustomRightElement,
    getCustomRowProps,
    onDismissError,
    selectedMembers,
    setSelectedMembers,
    canSelectMultiple = false,
    useSelectionModeHeader,
    onBackButtonPress,
    searchBarAccessory,
    preFilter,
    emptyStateTitle,
    emptyStateSubtitle,
}: BaseDomainMembersPageProps) {
    const {formatPhoneNumber, translate} = useLocalize();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const icons = useMemoizedLazyExpensifyIcons(['FallbackAvatar']);
    const illustrations = useMemoizedLazyIllustrations(['EmptyShelves']);

    const shouldDisplayButtonsInSeparateLine = useShouldDisplayButtonsInSeparateLine();

    const members: DomainMemberTableRowData[] = accountIDs
        .filter((accountID) => {
            const details = personalDetails?.[accountID];
            return !!details?.login || !!details?.displayName;
        })
        .map((accountID) => {
            const details = personalDetails?.[accountID];
            const login = details?.login ?? '';
            const customProps = getCustomRowProps?.(accountID, login);
            const isPendingActionDelete = customProps?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
            const isInteractive = !isPendingActionDelete && !details?.isOptimisticPersonalDetail;
            const text = formatPhoneNumber(getDisplayNameOrDefault(details));
            const alternateText = formatPhoneNumber(login);
            const keyForList = String(accountID);

            const memberOption: MemberOption = {keyForList, accountID, login, text, alternateText, pendingAction: customProps?.pendingAction};

            return {
                keyForList,
                accountID,
                login,
                text,
                alternateText,
                avatarSource: details?.avatar ?? icons.FallbackAvatar,
                rightElement: getCustomRightElement?.(accountID),
                errors: getLatestError(customProps?.errors),
                pendingAction: customProps?.pendingAction,
                brickRoadIndicator: customProps?.brickRoadIndicator,
                isInteractive,
                disabled: !isInteractive,
                action: () => onSelectRow(memberOption),
                dismissError: () => onDismissError?.(memberOption),
            };
        });

    const filteredMembers = preFilter ? members.filter(preFilter) : members;

    const selectionEnabled = canSelectMultiple && !!setSelectedMembers;
    const selectedKeys = selectedMembers ?? [];

    const listEmptyComponent = emptyStateTitle ? (
        <GenericEmptyStateComponent
            headerMedia={illustrations.EmptyShelves}
            headerContentStyles={styles.emptyShelvesIllustration}
            title={emptyStateTitle}
            subtitle={emptyStateSubtitle}
            headerStyles={styles.emptyStateCardIllustrationContainer}
        />
    ) : undefined;

    return (
        <DomainNotFoundPageWrapper domainAccountID={domainAccountID}>
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldEnableMaxHeight
                shouldShowOfflineIndicatorInWideScreen
                testID="BaseDomainMembersPage"
            >
                <HeaderWithBackButton
                    title={useSelectionModeHeader ? translate('common.selectMultiple') : headerTitle}
                    onBackButtonPress={onBackButtonPress ?? Navigation.goBack}
                    icon={!useSelectionModeHeader ? headerIcon : undefined}
                    shouldShowBackButton={shouldUseNarrowLayout}
                    shouldUseHeadlineHeader={!useSelectionModeHeader}
                    shouldDisplayHelpButton
                >
                    {!shouldDisplayButtonsInSeparateLine && !!headerContent && <View style={[styles.flexRow, styles.gap2]}>{headerContent}</View>}
                </HeaderWithBackButton>
                {shouldDisplayButtonsInSeparateLine && !!headerContent && <View style={[styles.ph5, styles.flexRow, styles.gap2]}>{headerContent}</View>}
                {!!searchBarAccessory && <View style={[styles.mh5, styles.mb5]}>{searchBarAccessory}</View>}
                <DomainMembersTable
                    members={filteredMembers}
                    memberColumnLabel={memberColumnLabel}
                    groupColumnLabel={groupColumnLabel}
                    selectionEnabled={selectionEnabled}
                    selectedKeys={selectedKeys}
                    onRowSelectionChange={(keys) => setSelectedMembers?.(keys)}
                    searchLabel={searchPlaceholder}
                    ListEmptyComponent={listEmptyComponent}
                />
            </ScreenWrapper>
        </DomainNotFoundPageWrapper>
    );
}

export type {MemberOption};
export default BaseDomainMembersPage;

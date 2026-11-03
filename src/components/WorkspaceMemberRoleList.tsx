import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import {getSelectableRoles, shouldShowNewRolesPromo} from '@libs/PolicyUtils';

import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';
import type {Policy} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import React from 'react';
import {View} from 'react-native';

import type {LocalizedTranslate} from './LocaleContextProvider';
import type {ConfirmButtonOptions, ListItem} from './SelectionList/types';

import Badge from './Badge';
import FormHelpMessage from './FormHelpMessage';
import HeaderWithBackButton from './HeaderWithBackButton';
import RenderHTML from './RenderHTML';
import SingleSelectListItem from './SelectionList/ListItem/SingleSelectListItem';
import SelectionListWithSections from './SelectionList/SelectionListWithSections';

type ListItemType = ListItem<ValueOf<typeof CONST.POLICY.ROLE>> & {
    value: ValueOf<typeof CONST.POLICY.ROLE>;
    text: string;
    alternateText: string;
    isSelected: boolean;
};

type WorkspaceMemberRoleListProps = {
    role: string | undefined;
    policy: OnyxEntry<Policy>;
    navigateBackTo?: Route;
    isLoading?: boolean;
    onSelectRole?: (value: ListItemType) => void;

    /** When provided, restricts the selectable roles to this set (e.g. an Authorized Payer may only be an Admin or Payments Admin) */
    allowedRoles?: Array<ValueOf<typeof CONST.POLICY.ROLE>>;

    /** When provided, the list confirms the pick with a button instead of applying it as soon as a row is pressed */
    confirmButtonOptions?: ConfirmButtonOptions<ListItemType>;

    /** Shown above the confirm button, for a confirmation pressed without a role picked */
    errorMessage?: string;

    /** Bump to have the error read out again, since a repeated confirmation leaves the message itself unchanged */
    errorAnnouncementKey?: number;
};

/** The roles of the `Admin roles` group in the role selector, in the alphabetical order of their display names. */
const ADMIN_GROUP_ROLES: Array<ValueOf<typeof CONST.POLICY.ROLE>> = [CONST.POLICY.ROLE.CARD_ADMIN, CONST.POLICY.ROLE.PAYMENTS_ADMIN, CONST.POLICY.ROLE.PEOPLE_ADMIN, CONST.POLICY.ROLE.ADMIN];

/** The roles of the `Other roles` group in the role selector, in the alphabetical order of their display names. */
const OTHER_GROUP_ROLES: Array<ValueOf<typeof CONST.POLICY.ROLE>> = [CONST.POLICY.ROLE.APPROVE_ONLY, CONST.POLICY.ROLE.AUDITOR, CONST.POLICY.ROLE.GUEST, CONST.POLICY.ROLE.USER];

/** The recently launched roles that carry a `New` badge while the New roles promotion runs. */
const NEW_ROLES: Array<ValueOf<typeof CONST.POLICY.ROLE>> = [CONST.POLICY.ROLE.APPROVE_ONLY, CONST.POLICY.ROLE.GUEST];

/**
 * Roles a member can be assigned, in the same order as the role-selection page.
 * Filters by what the current user may assign and any extra restriction (for example an Authorized Payer).
 */
function getAssignableWorkspaceMemberRoleItems(
    translate: LocalizedTranslate,
    currentRole: string | undefined,
    policy: OnyxEntry<Policy>,
    currentUserLogin: string,
    allowedRoles?: Array<ValueOf<typeof CONST.POLICY.ROLE>>,
): ListItemType[] {
    const workspaceRoles: ListItemType[] = [
        {
            value: CONST.POLICY.ROLE.ADMIN,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.ADMIN),
            alternateText: translate('workspace.common.adminAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.ADMIN,
            keyForList: CONST.POLICY.ROLE.ADMIN,
        },
        {
            value: CONST.POLICY.ROLE.AUDITOR,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.AUDITOR),
            alternateText: translate('workspace.common.auditorAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.AUDITOR,
            keyForList: CONST.POLICY.ROLE.AUDITOR,
        },
        {
            value: CONST.POLICY.ROLE.GUEST,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.GUEST),
            alternateText: translate('workspace.common.guestAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.GUEST,
            keyForList: CONST.POLICY.ROLE.GUEST,
        },
        {
            value: CONST.POLICY.ROLE.CARD_ADMIN,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.CARD_ADMIN),
            alternateText: translate('workspace.common.cardAdminAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.CARD_ADMIN,
            keyForList: CONST.POLICY.ROLE.CARD_ADMIN,
        },
        {
            value: CONST.POLICY.ROLE.PEOPLE_ADMIN,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.PEOPLE_ADMIN),
            alternateText: translate('workspace.common.peopleAdminAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.PEOPLE_ADMIN,
            keyForList: CONST.POLICY.ROLE.PEOPLE_ADMIN,
        },
        {
            value: CONST.POLICY.ROLE.PAYMENTS_ADMIN,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.PAYMENTS_ADMIN),
            alternateText: translate('workspace.common.paymentsAdminAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.PAYMENTS_ADMIN,
            keyForList: CONST.POLICY.ROLE.PAYMENTS_ADMIN,
        },
        {
            value: CONST.POLICY.ROLE.USER,
            text: translate('common.member'),
            alternateText: translate('workspace.common.memberAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.USER,
            keyForList: CONST.POLICY.ROLE.USER,
        },
        {
            value: CONST.POLICY.ROLE.APPROVE_ONLY,
            text: translate('workspace.common.roleName', CONST.POLICY.ROLE.APPROVE_ONLY),
            alternateText: translate('workspace.common.approveOnlyAlternateText'),
            isSelected: currentRole === CONST.POLICY.ROLE.APPROVE_ONLY,
            keyForList: CONST.POLICY.ROLE.APPROVE_ONLY,
        },
    ];

    const selectableRoles = getSelectableRoles(policy, currentUserLogin, allowedRoles);

    return workspaceRoles.filter((item) => selectableRoles.includes(item.value));
}

function WorkspaceMemberRoleList({
    role,
    policy,
    navigateBackTo = undefined,
    isLoading = false,
    onSelectRole = () => {},
    allowedRoles = undefined,
    confirmButtonOptions = undefined,
    errorMessage = '',
    errorAnnouncementKey = 0,
}: WorkspaceMemberRoleListProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {login: currentUserLogin = ''} = useCurrentUserPersonalDetails();

    const availableRoleItems = getAssignableWorkspaceMemberRoleItems(translate, role, policy, currentUserLogin, allowedRoles);
    const isNewRolesPromoActive = shouldShowNewRolesPromo(policy, currentUserLogin);

    // The `New` badges stay for the whole promo window, independent of the Members page banner dismissal.
    const toGroupedItem = (item: ListItemType): ListItemType =>
        isNewRolesPromoActive && NEW_ROLES.includes(item.value)
            ? {
                  ...item,
                  rightElement: (
                      <Badge
                          success
                          text={translate('common.new')}
                      />
                  ),
              }
            : item;

    const buildGroupItems = (groupRoles: Array<ValueOf<typeof CONST.POLICY.ROLE>>): ListItemType[] =>
        groupRoles.flatMap((groupRole) => {
            const item = availableRoleItems.find((roleItem) => roleItem.value === groupRole);
            return item ? [toGroupedItem(item)] : [];
        });

    const sections = [
        {title: translate('workspace.common.adminRoles'), data: buildGroupItems(ADMIN_GROUP_ROLES), sectionIndex: 0},
        {title: translate('workspace.common.otherRoles'), data: buildGroupItems(OTHER_GROUP_ROLES), sectionIndex: 1},
    ].filter((section) => section.data.length > 0);

    const listFooterContent = (
        <View style={[styles.ph5, styles.pt3]}>
            {!!errorMessage && (
                <View style={[styles.mb3]}>
                    {/* Remounting is what makes the alert speak again. The list is not inside a `Form`,
                        so `FormHelpMessage` has no submit count of its own to re-announce from. */}
                    <FormHelpMessage
                        key={errorAnnouncementKey}
                        isError
                        message={errorMessage}
                    />
                </View>
            )}
            <View style={styles.renderHTML}>
                <RenderHTML html={translate('workspace.common.roleSelectorFooter')} />
            </View>
        </View>
    );

    return (
        <>
            <HeaderWithBackButton
                title={translate('common.role')}
                onBackButtonPress={() => Navigation.goBack(navigateBackTo)}
            />
            {!isLoading && (
                <View style={[styles.containerWithSpaceBetween, styles.pointerEventsBoxNone]}>
                    <View style={[styles.ph5, styles.pb3, styles.renderHTML]}>
                        <RenderHTML html={translate('workspace.common.roleSelectorSubtitle')} />
                    </View>
                    <SelectionListWithSections
                        sections={sections}
                        ListItem={SingleSelectListItem}
                        onSelectRow={onSelectRole}
                        confirmButtonOptions={confirmButtonOptions}
                        shouldSingleExecuteRowSelect={!confirmButtonOptions?.showButton}
                        initiallyFocusedItemKey={availableRoleItems.find((item) => item.isSelected)?.keyForList}
                        listFooterContent={listFooterContent}
                        addBottomSafeAreaPadding
                    />
                </View>
            )}
        </>
    );
}

export default WorkspaceMemberRoleList;
export {getAssignableWorkspaceMemberRoleItems};
export type {ListItemType};

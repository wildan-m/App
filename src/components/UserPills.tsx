import {Str} from 'expensify-common';
import React from 'react';
import {View} from 'react-native';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import type {AvatarSource} from '@libs/UserAvatarUtils';
import CONST from '@src/CONST';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';
import OfflineWithFeedback from './OfflineWithFeedback';
import PressableWithoutFeedback from './Pressable/PressableWithoutFeedback';
import Text from './Text';
import Tooltip from './Tooltip';
import UserPill from './UserPill';

type UserPillData = {
    avatar?: AvatarSource;
    displayName: string;
    accountID?: number;
    email?: string;

    /** Pending action used to render the pill with reduced opacity while an offline change (e.g. inviting a member) is in flight. */
    pendingAction?: PendingAction;
};

type UserPillsProps = {
    users: UserPillData[];
    maxVisible?: number;
} & (
    | {onShowAllPress?: undefined; showAllSentryLabel?: undefined}
    | {
          /** When provided, the "+X more" text becomes its own tap target — bypasses any parent row's onPress. */
          onShowAllPress: () => void;
          /** Sentry label for the "+X more" pressable. */
          showAllSentryLabel: string;
      }
);

const DEFAULT_MAX_VISIBLE = 6;

function UserPills({users, maxVisible = DEFAULT_MAX_VISIBLE, onShowAllPress, showAllSentryLabel}: UserPillsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    // Show the extra pill instead of "+1 more" when only 1 would be hidden.
    const visibleUsers = users.length <= maxVisible + 1 ? users : users.slice(0, maxVisible);
    const hiddenCount = users.length - visibleUsers.length;
    const hiddenNames =
        hiddenCount > 0
            ? users
                  .slice(visibleUsers.length)
                  .map((u) => Str.removeSMSDomain(u.displayName))
                  .join(', ')
            : '';

    return (
        <View style={[styles.flexRow, styles.flexWrap, styles.userPillsContainer]}>
            {visibleUsers.map((user) => {
                const hasRealAccountID = user.accountID !== undefined && user.accountID !== CONST.DEFAULT_NUMBER_ID;
                const key = hasRealAccountID ? user.accountID : (user.email ?? user.displayName);
                const pill = (
                    <UserPill
                        avatar={user.avatar}
                        displayName={user.displayName}
                        accountID={user.accountID}
                        email={user.email}
                    />
                );
                // Wrap pending pills so an in-flight offline change (e.g. inviting a member) renders the
                // pill at reduced opacity, matching the approver row. Non-pending pills stay unwrapped to
                // avoid changing layout for the other UserPills callers.
                if (!user.pendingAction) {
                    return <React.Fragment key={key}>{pill}</React.Fragment>;
                }
                return (
                    <OfflineWithFeedback
                        key={key}
                        pendingAction={user.pendingAction}
                    >
                        {pill}
                    </OfflineWithFeedback>
                );
            })}
            {hiddenCount > 0 && (
                <Tooltip text={hiddenNames}>
                    {onShowAllPress ? (
                        <PressableWithoutFeedback
                            onPress={onShowAllPress}
                            accessibilityRole="button"
                            accessibilityLabel={translate('common.plusMore', {count: hiddenCount})}
                            sentryLabel={showAllSentryLabel}
                            style={[styles.flexRow, styles.alignItemsCenter]}
                        >
                            <Text style={styles.userPillMoreText}>{translate('common.plusMore', {count: hiddenCount})}</Text>
                        </PressableWithoutFeedback>
                    ) : (
                        <View style={[styles.flexRow, styles.alignItemsCenter]}>
                            <Text style={styles.userPillMoreText}>{translate('common.plusMore', {count: hiddenCount})}</Text>
                        </View>
                    )}
                </Tooltip>
            )}
        </View>
    );
}

UserPills.displayName = 'UserPills';

export default UserPills;

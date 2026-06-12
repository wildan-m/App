import React from 'react';
import {View} from 'react-native';
import Avatar from '@components/Avatar';
import Icon from '@components/Icon';
import TableRow from '@components/Table/TableRow';
import Text from '@components/Text';
import TextWithTooltip from '@components/TextWithTooltip';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {DomainMemberTableRowData} from '.';

type DomainMembersTableRowProps = {
    /** The member data for the row */
    item: DomainMemberTableRowData;

    /** The index of the row in the table */
    rowIndex: number;

    /** Whether the group column is shown */
    shouldShowGroupColumn: boolean;
};

export default function DomainMembersTableRow({item, rowIndex, shouldShowGroupColumn}: DomainMembersTableRowProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const icons = useMemoizedLazyExpensifyIcons(['FallbackAvatar', 'ArrowRight', 'DotIndicator']);

    const BrickRoadIndicator = !!item.brickRoadIndicator && (
        <Icon
            src={icons.DotIndicator}
            fill={item.brickRoadIndicator === CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR ? theme.danger : theme.iconSuccessFill}
        />
    );

    return (
        <TableRow
            interactive={item.isInteractive}
            rowIndex={rowIndex}
            onPress={item.action}
            disabled={item.disabled}
            accessibilityLabel={item.text}
            skeletonReasonAttributes={{context: 'domainMembersTableRow'}}
            offlineWithFeedback={{
                errors: item.errors,
                pendingAction: item.pendingAction,
                onClose: item.dismissError,
            }}
        >
            {({hovered}) => (
                <>
                    <View style={[styles.flex1, styles.flexRow, styles.gap3, styles.alignItemsCenter]}>
                        <Avatar
                            source={item.avatarSource}
                            avatarID={item.accountID}
                            name={item.text}
                            type={CONST.ICON_TYPE_AVATAR}
                            size={CONST.AVATAR_SIZE.DEFAULT}
                            fallbackIcon={icons.FallbackAvatar}
                            imageStyles={styles.alignSelfCenter}
                        />
                        <View style={[styles.flex1, styles.gap1]}>
                            <TextWithTooltip
                                shouldShowTooltip
                                text={item.text}
                                style={styles.flexShrink1}
                            />
                            {!!item.alternateText && (
                                <Text
                                    numberOfLines={1}
                                    style={[styles.textLabelSupporting, styles.flexShrink1]}
                                >
                                    {item.alternateText}
                                </Text>
                            )}
                        </View>
                        {!shouldShowGroupColumn && !!item.rightElement && (
                            <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentEnd, styles.gap2]}>{item.rightElement}</View>
                        )}
                    </View>

                    {shouldShowGroupColumn && <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter]}>{item.rightElement}</View>}

                    <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentEnd, styles.gap2]}>
                        {BrickRoadIndicator}
                        <Icon
                            src={icons.ArrowRight}
                            fill={theme.icon}
                            additionalStyles={[styles.alignSelfCenter, (!hovered || !item.isInteractive) && styles.opacitySemiTransparent]}
                            width={variables.iconSizeNormal}
                            height={variables.iconSizeNormal}
                        />
                    </View>
                </>
            )}
        </TableRow>
    );
}

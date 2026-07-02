import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Icon from '@components/Icon';
import ReportActionAvatars from '@components/ReportActionAvatars';
import Table from '@components/Table';
import TextWithTooltip from '@components/TextWithTooltip';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {AgentRowData} from '.';

type AgentsTableRowProps = {
    /** The agent item for the row */
    item: AgentRowData;

    /** The index of the row relative to all other rows */
    rowIndex: number;

    /** Whether to use narrow table row layout */
    shouldUseNarrowTableLayout: boolean;
};

export default function AgentsTableRow({item, rowIndex, shouldUseNarrowTableLayout}: AgentsTableRowProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['ArrowRight', 'ChatBubble']);

    const avatarSize = shouldUseNarrowTableLayout ? CONST.AVATAR_SIZE.DEFAULT : CONST.AVATAR_SIZE.SMALL;
    const accessibilityLabel = `${item.displayName}, ${item.login}`;

    return (
        <Table.Row
            interactive
            rowIndex={rowIndex}
            disabled={item.isPendingDeletion}
            accessibilityLabel={accessibilityLabel}
            sentryLabel="AgentsTableRow-Edit"
            offlineWithFeedback={{errors: item.errors ?? undefined, pendingAction: item.pendingAction ?? undefined, onClose: item.dismissError, shouldHideOnDelete: false}}
            onPress={item.action}
        >
            {({hovered}) => (
                <>
                    <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter, styles.gap3]}>
                        <ReportActionAvatars
                            size={avatarSize}
                            accountIDs={[item.accountID]}
                            fallbackDisplayName={item.displayName ?? item.login}
                            shouldShowTooltip={false}
                        />
                        <View style={[shouldUseNarrowTableLayout && styles.gap1, styles.flex1]}>
                            <TextWithTooltip
                                shouldShowTooltip
                                text={item.displayName}
                                style={[styles.optionDisplayName, styles.pre, item.isPendingDeletion && styles.offlineFeedbackDeleted]}
                                numberOfLines={1}
                            />
                            <TextWithTooltip
                                shouldShowTooltip
                                text={item.login}
                                style={[styles.textLabelSupporting, styles.lh16, styles.pre, item.isPendingDeletion && styles.offlineFeedbackDeleted]}
                                numberOfLines={1}
                            />
                        </View>
                    </View>

                    <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentEnd, styles.gap2]}>
                        {!shouldUseNarrowTableLayout && (
                            <>
                                <Button
                                    small
                                    icon={icons.ChatBubble}
                                    onPress={item.onChatPress}
                                    isDisabled={item.areActionsDisabled}
                                    accessibilityLabel={translate('editAgentPage.chatWithAgent')}
                                />
                                <Button
                                    small
                                    text={translate('delegate.copilot')}
                                    onPress={item.onCopilotPress}
                                    isDisabled={item.areActionsDisabled}
                                    accessibilityLabel={translate('editAgentPage.copilotIntoAccount')}
                                />
                                <Button
                                    small
                                    text={translate('common.edit')}
                                    onPress={item.action}
                                    isDisabled={item.isPendingDeletion}
                                />
                            </>
                        )}
                        <Icon
                            src={icons.ArrowRight}
                            fill={theme.icon}
                            additionalStyles={[styles.justifyContentCenter, styles.alignItemsCenter, !hovered && styles.opacitySemiTransparent]}
                            width={variables.iconSizeNormal}
                            height={variables.iconSizeNormal}
                        />
                    </View>
                </>
            )}
        </Table.Row>
    );
}

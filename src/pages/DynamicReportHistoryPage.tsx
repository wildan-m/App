import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useDynamicBackPath from '@hooks/useDynamicBackPath';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReportHistoryParamList} from '@libs/Navigation/types';
import {temporaryGetDisplayNameOrDefault} from '@libs/PersonalDetailsUtils';
import type {ReportHistoryStepType} from '@libs/ReportHistoryUtils';
import {buildReportHistoryEntries, REPORT_HISTORY_STEP} from '@libs/ReportHistoryUtils';

import variables from '@styles/variables';

import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import type {WithReportOrNotFoundProps} from './inbox/report/withReportOrNotFound';

import withReportOrNotFound from './inbox/report/withReportOrNotFound';

type DynamicReportHistoryPageProps = WithReportOrNotFoundProps & PlatformStackScreenProps<ReportHistoryParamList, typeof SCREENS.REPORT_HISTORY.DYNAMIC_ROOT>;

function DynamicReportHistoryPage({report, policy}: DynamicReportHistoryPageProps) {
    const {translate, formatPhoneNumber, datetimeToRelative} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['Receipt', 'Send', 'ThumbsUp', 'Stopwatch', 'MoneyBag']);
    const backPath = useDynamicBackPath(DYNAMIC_ROUTES.REPORT_HISTORY.path);

    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report?.reportID}`);
    const [rules] = useOnyx(ONYXKEYS.COLLECTION.RULE);
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);

    const entries = buildReportHistoryEntries(report, Object.values(reportActions ?? {}), policy, rules, personalDetails);

    const stepIconMap = {
        [REPORT_HISTORY_STEP.CREATED]: icons.Receipt,
        [REPORT_HISTORY_STEP.SUBMITTED]: icons.Send,
        [REPORT_HISTORY_STEP.APPROVED]: icons.ThumbsUp,
        [REPORT_HISTORY_STEP.REROUTED]: icons.ThumbsUp,
        [REPORT_HISTORY_STEP.HELD]: icons.Stopwatch,
        [REPORT_HISTORY_STEP.PAID]: icons.MoneyBag,
        [REPORT_HISTORY_STEP.TO_APPROVE]: icons.ThumbsUp,
        [REPORT_HISTORY_STEP.TO_PAY]: icons.MoneyBag,
    } as const satisfies Record<ReportHistoryStepType, unknown>;

    return (
        <ScreenWrapper
            testID="DynamicReportHistoryPage"
            includeSafeAreaPaddingBottom
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton
                title={translate('reportHistory.title')}
                onBackButtonPress={() => Navigation.goBack(backPath)}
            />
            <ScrollView contentContainerStyle={[styles.ph5, styles.pv3]}>
                {entries.map((entry, index) => {
                    const displayName = temporaryGetDisplayNameOrDefault({
                        passedPersonalDetails: entry.accountID ? personalDetails?.[entry.accountID] : undefined,
                        translate,
                        formatPhoneNumber,
                    });

                    return (
                        <View key={entry.key}>
                            {index > 0 && <View style={[styles.reportHistoryConnectorLine, entry.isFuture && styles.opacitySemiTransparent]} />}
                            <View style={[styles.flexRow, styles.alignItemsCenter, entry.isFuture && styles.opacitySemiTransparent]}>
                                <View style={styles.reportHistoryStepIconContainer}>
                                    <Icon
                                        src={stepIconMap[entry.type]}
                                        width={variables.iconSizeSemiSmall}
                                        height={variables.iconSizeSemiSmall}
                                        fill={theme.icon}
                                    />
                                </View>
                                <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter, styles.ml3]}>
                                    <Text style={styles.flex1}>
                                        <Text style={styles.textStrong}>{displayName}</Text>
                                        <Text>{` ${translate(`reportHistory.steps.${entry.type}`)}`}</Text>
                                    </Text>
                                    {!!entry.created && <Text style={styles.textMicroSupporting}>{datetimeToRelative(entry.created)}</Text>}
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </ScreenWrapper>
    );
}

export default withReportOrNotFound()(DynamicReportHistoryPage);

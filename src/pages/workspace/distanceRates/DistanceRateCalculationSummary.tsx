import Icon from '@components/Icon';
import SkeletonTextLine from '@components/Skeletons/SkeletonTextLine';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import DateUtils from '@libs/DateUtils';
import {getActiveGovernmentRateForCountry} from '@libs/PolicyDistanceRatesUtils';
import {getUnitTranslationKey} from '@libs/WorkspaceDisplayUtils';

import variables from '@styles/variables';

import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Unit} from '@src/types/onyx/Policy';

import type {StyleProp, ViewStyle} from 'react-native';

import {Str} from 'expensify-common';
import React from 'react';
import {View} from 'react-native';

/** Countries whose government-rate note is a static sentence, mapped to the note's translation key */
const STATIC_NOTE_KEYS: Record<string, TranslationPaths> = {
    AU: 'workspace.distanceRates.calculationSummary.countryNotes.AU',
    AT: 'workspace.distanceRates.calculationSummary.countryNotes.AT',
    NL: 'workspace.distanceRates.calculationSummary.countryNotes.NL',
    NO: 'workspace.distanceRates.calculationSummary.countryNotes.NO',
};

/** The two countries whose note shows a value from the government reference rate, so the note loads with the rate */
const BELGIUM = 'BE';
const SWEDEN = 'SE';

/** Kilometers in one Swedish mil, the unit Skatteverket publishes per */
const KILOMETERS_PER_SWEDISH_MIL = 10;

/** Width of the note's loading bar, picked to read as a one-line note */
const NOTE_SKELETON_BAR_WIDTH = 240;

type DistanceRateCalculationSummaryProps = {
    /** Distance unit of the workspace's distance custom unit */
    unit: Unit;

    /** Currency code the rate is paid in — the workspace's default currency */
    currency: string;

    /** ISO country code the rate is for, when the form knows it */
    country?: string;

    /** Whether the rate being created is a government rate. Custom rates show the unit line only. */
    isGovernmentRate?: boolean;

    /** Styles for the container */
    style?: StyleProp<ViewStyle>;
};

/**
 * The short summary at the bottom of Add rate explaining how the rate will be calculated: a unit line on every rate,
 * plus one informational note on government rates for the countries whose authority attaches a limit or condition.
 */
function DistanceRateCalculationSummary({unit, currency, country, isGovernmentRate = false, style}: DistanceRateCalculationSummaryProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate, dateFnsLocale} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Car', 'Info']);
    const [governmentMileageRates] = useOnyx(ONYXKEYS.GOVERNMENT_MILEAGE_RATES);

    const unitLine = translate('workspace.distanceRates.calculationSummary.unitLine', Str.recapitalize(translate(getUnitTranslationKey(unit))), currency);

    const needsActiveRate = isGovernmentRate && (country === BELGIUM || country === SWEDEN);
    const activeRate = needsActiveRate ? getActiveGovernmentRateForCountry(governmentMileageRates, country) : undefined;

    let note: string | undefined;
    if (isGovernmentRate && country) {
        const staticNoteKey = STATIC_NOTE_KEYS[country];
        if (staticNoteKey) {
            note = translate(staticNoteKey);
        } else if (country === BELGIUM && activeRate) {
            note = translate('workspace.distanceRates.calculationSummary.countryNotes.BE', DateUtils.formatToReadableString(activeRate.startDate, dateFnsLocale));
        } else if (country === SWEDEN && activeRate) {
            // The reference amount is in öre per kilometer, and the note shows kronor per Swedish mil
            note = translate('workspace.distanceRates.calculationSummary.countryNotes.SE', String((activeRate.rate * KILOMETERS_PER_SWEDISH_MIL) / 100));
        }
    }
    const isNoteLoading = needsActiveRate && !activeRate;

    return (
        <View style={style}>
            <View style={[styles.flexRow, styles.alignItemsCenter]}>
                <Icon
                    src={icons.Car}
                    fill={theme.icon}
                    width={variables.iconSizeSmall}
                    height={variables.iconSizeSmall}
                    additionalStyles={styles.mr2}
                />
                <Text style={[styles.textSupporting, styles.flex1]}>{unitLine}</Text>
            </View>
            {(!!note || isNoteLoading) && (
                <View style={[styles.flexRow, styles.alignItemsStart, styles.mt2]}>
                    <Icon
                        src={icons.Info}
                        fill={theme.icon}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                        additionalStyles={styles.mr2}
                    />
                    {isNoteLoading ? (
                        <View style={styles.flex1}>
                            <SkeletonTextLine
                                lineHeight={variables.fontSizeNormalHeight}
                                barWidth={NOTE_SKELETON_BAR_WIDTH}
                            />
                        </View>
                    ) : (
                        <Text style={[styles.textSupporting, styles.flex1]}>{note}</Text>
                    )}
                </View>
            )}
        </View>
    );
}

export default DistanceRateCalculationSummary;

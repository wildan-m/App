import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import convertToLTR from '@libs/convertToLTR';

import colors from '@styles/theme/colors';
import variables from '@styles/variables';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type IconAsset from '@src/types/utils/IconAsset';

import React from 'react';
import {View} from 'react-native';

import Button from './Button';
import FeatureTraining from './FeatureTraining';
import {useFeatureTrainingActions} from './FeatureTraining/context';
import Icon from './Icon';
import RenderHTML from './RenderHTML';

type MergeReportsSuggestionSection = {
    /** The icon supplied with the section */
    icon: IconAsset;

    titleTranslationKey: TranslationPaths;
};

/** Secondary button that closes the modal without merging, so the move runs as usual */
function JustMoveButton() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {handleClose} = useFeatureTrainingActions();

    return (
        <Button
            size={CONST.BUTTON_SIZE.LARGE}
            onPress={handleClose}
            sentryLabel={CONST.SENTRY_LABEL.MERGE_REPORTS_SUGGESTION_MODAL.JUST_MOVE_BUTTON}
            style={styles.flex1}
        >
            <Button.Text>{translate('iou.mergeReportsSuggestion.justMove')}</Button.Text>
        </Button>
    );
}

/** The content of the "Merge these reports instead?" modal, shown when every expense on a report is being moved to another report */
function MergeReportsSuggestionModalContent() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const illustrations = useMemoizedLazyIllustrations(['ReceiptWranglerSpaceCowgirl', 'FolderOpen', 'Broom']);

    const sections: MergeReportsSuggestionSection[] = [
        {
            icon: illustrations.FolderOpen,
            titleTranslationKey: 'iou.mergeReportsSuggestion.nextTime',
        },
        {
            icon: illustrations.Broom,
            titleTranslationKey: 'iou.mergeReportsSuggestion.deletesEmptyReport',
        },
    ];

    return (
        <>
            <FeatureTraining.Illustration
                image={illustrations.ReceiptWranglerSpaceCowgirl}
                contentFitImage="cover"
                aspectRatio={CONST.ILLUSTRATION_ASPECT_RATIO}
                innerContainerStyle={[styles.alignItemsCenter, styles.justifyContentCenter, StyleUtils.getBackgroundColorStyle(colors.green700)]}
                outerContainerStyle={styles.p0}
            />
            <FeatureTraining.Body>
                <FeatureTraining.BodyText style={[styles.mb5, styles.gap2]}>
                    <FeatureTraining.Title>{translate('iou.mergeReportsSuggestion.title')}</FeatureTraining.Title>
                    <FeatureTraining.Description>{translate('iou.mergeReportsSuggestion.description')}</FeatureTraining.Description>
                    {sections.map((section) => (
                        <View
                            key={section.titleTranslationKey}
                            style={[styles.flexRow, styles.alignItemsCenter, styles.mt3]}
                        >
                            <Icon
                                width={variables.menuIconSize}
                                height={variables.menuIconSize}
                                src={section.icon}
                                additionalStyles={[styles.mr4]}
                            />
                            <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter, styles.wAuto]}>
                                <RenderHTML html={`<comment>${convertToLTR(translate(section.titleTranslationKey))}</comment>`} />
                            </View>
                        </View>
                    ))}
                </FeatureTraining.BodyText>
                <FeatureTraining.ButtonRow>
                    <JustMoveButton />
                    <FeatureTraining.ConfirmButton
                        sentryLabel={CONST.SENTRY_LABEL.MERGE_REPORTS_SUGGESTION_MODAL.MERGE_BUTTON}
                        style={styles.flex1}
                    >
                        {translate('iou.mergeReportsSuggestion.mergeReports')}
                    </FeatureTraining.ConfirmButton>
                </FeatureTraining.ButtonRow>
            </FeatureTraining.Body>
        </>
    );
}

export default MergeReportsSuggestionModalContent;

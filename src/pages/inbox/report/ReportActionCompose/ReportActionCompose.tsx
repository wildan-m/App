import React from 'react';
import {View} from 'react-native';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import ONYXKEYS from '@src/ONYXKEYS';
import ComposerActionMenu from './ComposerActionMenu';
import ComposerBox from './ComposerBox';
import ComposerContainer from './ComposerContainer';
import {useComposerState} from './ComposerContext';
import type {SuggestionsRef} from './ComposerContext';
import ComposerDefaultFooter from './ComposerDefaultFooter';
import ComposerDropZone from './ComposerDropZone';
import ComposerEditingButtons from './ComposerEditingButtons';
import ComposerEmojiPicker from './ComposerEmojiPicker';
import ComposerExceededLength from './ComposerExceededLength';
import ComposerFooter from './ComposerFooter';
import ComposerImportedState from './ComposerImportedState';
import ComposerInput from './ComposerInput';
import ComposerInputArea from './ComposerInputArea';
import ComposerLocalTime from './ComposerLocalTime';
import ComposerPlaceholder from './ComposerPlaceholder';
import ComposerProvider from './ComposerProvider';
import ComposerSendButton from './ComposerSendButton';
import ComposerTypingIndicator from './ComposerTypingIndicator';

type ReportActionComposeProps = {
    /** Report ID */
    reportID: string;
};

function ComposerLayout() {
    const {reportID} = useComposerState();
    const styles = useThemeStyles();
    const [isComposerFullSize = false] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_IS_COMPOSER_FULL_SIZE}${reportID}`);

    return (
        <View style={isComposerFullSize ? styles.chatItemFullComposeRow : undefined}>
            <ComposerInputArea />
            <ComposerDefaultFooter />
        </View>
    );
}

function ReportActionCompose({reportID}: ReportActionComposeProps) {
    return (
        <ComposerProvider reportID={reportID}>
            <ComposerLayout />
        </ComposerProvider>
    );
}

function EditOnlyReportActionCompose({reportID}: ReportActionComposeProps) {
    return (
        <ComposerProvider reportID={reportID}>
            <ComposerInputArea />
        </ComposerProvider>
    );
}

ReportActionCompose.LocalTime = ComposerLocalTime;
ReportActionCompose.Container = ComposerContainer;
ReportActionCompose.ImportedState = ComposerImportedState;
ReportActionCompose.DropZone = ComposerDropZone;
ReportActionCompose.Box = ComposerBox;
ReportActionCompose.ActionMenu = ComposerActionMenu;
ReportActionCompose.Input = ComposerInput;
ReportActionCompose.EmojiPicker = ComposerEmojiPicker;
ReportActionCompose.SendButton = ComposerSendButton;
ReportActionCompose.EditingButtons = ComposerEditingButtons;
ReportActionCompose.Footer = ComposerFooter;
ReportActionCompose.TypingIndicator = ComposerTypingIndicator;
ReportActionCompose.ExceededLength = ComposerExceededLength;
ReportActionCompose.Layout = ComposerInputArea;
ReportActionCompose.Placeholder = ComposerPlaceholder;
ReportActionCompose.InputArea = ComposerInputArea;
ReportActionCompose.DefaultFooter = ComposerDefaultFooter;
ReportActionCompose.EditOnly = EditOnlyReportActionCompose;

export default ReportActionCompose;
export type {SuggestionsRef, ReportActionComposeProps};

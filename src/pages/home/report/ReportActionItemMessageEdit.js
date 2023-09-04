import lodashGet from 'lodash/get';
import React, {useState, useRef, useMemo, useEffect, useCallback} from 'react';
import {InteractionManager, Keyboard, View} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ExpensiMark from 'expensify-common/lib/ExpensiMark';
import Str from 'expensify-common/lib/str';
import reportActionPropTypes from './reportActionPropTypes';
import styles from '../../../styles/styles';
import compose from '../../../libs/compose';
import themeColors from '../../../styles/themes/default';
import * as StyleUtils from '../../../styles/StyleUtils';
import containerComposeStyles from '../../../styles/containerComposeStyles';
import Composer from '../../../components/Composer';
import * as Report from '../../../libs/actions/Report';
import {withReportActionsDrafts} from '../../../components/OnyxProvider';
import openReportActionComposeViewWhenClosingMessageEdit from '../../../libs/openReportActionComposeViewWhenClosingMessageEdit';
import ReportActionComposeFocusManager from '../../../libs/ReportActionComposeFocusManager';
import EmojiPickerButton from '../../../components/EmojiPicker/EmojiPickerButton';
import Icon from '../../../components/Icon';
import * as Expensicons from '../../../components/Icon/Expensicons';
import Tooltip from '../../../components/Tooltip';
import * as ReportActionContextMenu from './ContextMenu/ReportActionContextMenu';
import * as ReportUtils from '../../../libs/ReportUtils';
import * as EmojiUtils from '../../../libs/EmojiUtils';
import reportPropTypes from '../../reportPropTypes';
import ExceededCommentLength from '../../../components/ExceededCommentLength';
import CONST from '../../../CONST';
import refPropTypes from '../../../components/refPropTypes';
import * as ComposerUtils from '../../../libs/ComposerUtils';
import * as ComposerActions from '../../../libs/actions/Composer';
import * as User from '../../../libs/actions/User';
import PressableWithFeedback from '../../../components/Pressable/PressableWithFeedback';
import getButtonState from '../../../libs/getButtonState';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import useLocalize from '../../../hooks/useLocalize';
import useKeyboardState from '../../../hooks/useKeyboardState';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import useReportScrollManager from '../../../hooks/useReportScrollManager';
import * as EmojiPickerAction from '../../../libs/actions/EmojiPickerAction';
import focusWithDelay from '../../../libs/focusWithDelay';
import ONYXKEYS from '../../../ONYXKEYS';
import { withOnyx } from 'react-native-onyx';
import Navigation from '../../../libs/Navigation/Navigation';
import usePrevious from '../../../hooks/usePrevious';

const propTypes = {
    /** All the data of the action */
    action: PropTypes.shape(reportActionPropTypes).isRequired,

    /** Draft message */
    draftMessage: PropTypes.string.isRequired,

    /** ReportID that holds the comment we're editing */
    reportID: PropTypes.string.isRequired,

    /** Position index of the report action in the overall report FlatList view */
    index: PropTypes.number.isRequired,

    /** A ref to forward to the text input */
    forwardedRef: refPropTypes,

    /** The report currently being looked at */
    // eslint-disable-next-line react/no-unused-prop-types
    report: reportPropTypes,

    /** Whether or not the emoji picker is disabled */
    shouldDisableEmojiPicker: PropTypes.bool,

    /** Draft message - if this is set the comment is in 'edit' mode */
    // eslint-disable-next-line react/forbid-prop-types
    drafts: PropTypes.object,

    /** Stores user's preferred skin tone */
    preferredSkinTone: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

    /** Details about any modals being used */
    modal: PropTypes.shape({
        /** Indicates if there is a modal currently visible or not */
        isVisible: PropTypes.bool,
    }),

    ...withLocalizePropTypes,
};

const defaultProps = {
    forwardedRef: () => {},
    report: {},
    shouldDisableEmojiPicker: false,
    preferredSkinTone: CONST.EMOJI_DEFAULT_SKIN_TONE,
    drafts: {},
    modal: {},
};

// native ids
const saveButtonID = 'saveButton';
const cancelButtonID = 'cancelButton';
const emojiButtonID = 'emojiButton';
const messageEditInput = 'messageEditInput';


function ReportActionItemMessageEdit(props) {
    const reportScrollManager = useReportScrollManager();
    const {translate} = useLocalize();
    const {isKeyboardShown} = useKeyboardState();
    const {isSmallScreenWidth} = useWindowDimensions();
    const prevProps = usePrevious(props);

    const [draft, setDraft] = useState(() => {
        if (props.draftMessage === props.action.message[0].html) {
            // We only convert the report action message to markdown if the draft message is unchanged.
            const parser = new ExpensiMark();
            return parser.htmlToMarkdown(props.draftMessage).trim();
        }
        // We need to decode saved draft message because it's escaped before saving.
        return Str.htmlDecode(props.draftMessage);
    });
    const [selection, setSelection] = useState({start: 0, end: 0});
    const [isFocused, setIsFocused] = useState(false);
    const [hasExceededMaxCommentLength, setHasExceededMaxCommentLength] = useState(false);

    const textInputRef = useRef(null);
    const isFocusedRef = useRef(false);
    const insertedEmojis = useRef([]);
    const isEmojiSelected = useRef(false);

    const isActive = () => {
        console.log('[wildebug] isFocused', isFocused)
        console.log('[wildebug] EmojiPickerAction.isActive(props.action.reportActionID)', EmojiPickerAction.isActive(props.action.reportActionID))
        console.log('[wildebug] ReportActionContextMenu.isActiveReportAction(props.action.reportActionID)', ReportActionContextMenu.isActiveReportAction(props.action.reportActionID))
        return isFocused || EmojiPickerAction.isActive(props.action.reportActionID) || ReportActionContextMenu.isActiveReportAction(props.action.reportActionID);
    }

    useEffect(() => {
        // console.log(`[wildebug] isActive ${props.action.message[0].html}`, isActive());
        console.log(`[wildebug] props.modal.willAlertModalBecomeVisible`, props.modal.willAlertModalBecomeVisible);
        console.log(`[wildebug] props.modal.isVisible`, props.modal.isVisible);
        console.log(`[wildebug] isFocusedRef.current`, isFocusedRef.current);
        console.log(`[wildebug] isFocused`, isFocused);
        console.log('[wildebug] insertedEmojis.current.length', insertedEmojis.current.length)
        console.log('[wildebug] draft', draft)
        console.log('[wildebug] selection', selection)
        // console.log('[wildebug] prevProps', prevProps)
        // console.log('[wildebug] props', props)
     

        if (props.modal.isVisible || !isFocusedRef.current) {
            console.log('[wildebug]  if (props.modal.isVisible || !isFocusedRef.current) {');
            return;
        }

        // if(isFocusedRef.current)
        // {
        //     textInputRef.current.blur();
        // }

        setIsFocused(false);
        console.log('[wildebug] ReportActionComposeFocusManager.focus(true);', draft);
        ReportActionComposeFocusManager.focus(true);
    }, [props.modal.isVisible]);

    useEffect(() => {
        // required for keeping last state of isFocused variable
        isFocusedRef.current = isFocused;
    }, [isFocused]);

    useEffect(() => {
        // For mobile Safari, updating the selection prop on an unfocused input will cause it to automatically gain focus
        // and subsequent programmatic focus shifts (e.g., modal focus trap) to show the blue frame (:focus-visible style),
        // so we need to ensure that it is only updated after focus.
        setDraft((prevDraft) => {
            setSelection({
                start: prevDraft.length,
                end: prevDraft.length,
            });
            return prevDraft;
        });

        return () => {
            // Skip if this is not the focused message so the other edit composer stays focused.
            // In small screen devices, when EmojiPicker is shown, the current edit message will lose focus, we need to check this case as well.
            if (!isFocusedRef.current && !EmojiPickerAction.isActive(props.action.reportActionID)) {
                return;
            }

            // Show the main composer when the focused message is deleted from another client
            // to prevent the main composer stays hidden until we swtich to another chat.
            console.log('[wildebug] to prevent the main composer stays ihasohdfowe')
            ComposerActions.setShouldShowComposeInput(true);
        };
    }, [props.action.reportActionID]);

    /**
     * Save the draft of the comment. This debounced so that we're not ceaselessly saving your edit. Saving the draft
     * allows one to navigate somewhere else and come back to the comment and still have it in edit mode.
     * @param {String} newDraft
     */
    const debouncedSaveDraft = useMemo(
        () =>
            _.debounce((newDraft) => {
                Report.saveReportActionDraft(props.reportID, props.action.reportActionID, newDraft);
            }, 1000),
        [props.reportID, props.action.reportActionID],
    );

    /**
     * Update frequently used emojis list. We debounce this method in the constructor so that UpdateFrequentlyUsedEmojis
     * API is not called too often.
     */
    const debouncedUpdateFrequentlyUsedEmojis = useMemo(
        () =>
            _.debounce(() => {
                User.updateFrequentlyUsedEmojis(EmojiUtils.getFrequentlyUsedEmojis(insertedEmojis.current));
                insertedEmojis.current = [];
            }, 1000),
        [],
    );

    /**
     * Update the value of the draft in Onyx
     *
     * @param {String} newDraftInput
     */
    const updateDraft = useCallback(
        (newDraftInput) => {
            console.log('[wildebug] updateDraft')
            const {text: newDraft, emojis} = EmojiUtils.replaceAndExtractEmojis(newDraftInput, props.preferredSkinTone, props.preferredLocale);

            if (!_.isEmpty(emojis)) {
                insertedEmojis.current = [...insertedEmojis.current, ...emojis];
                debouncedUpdateFrequentlyUsedEmojis();
            }
            setDraft((prevDraft) => {
                if (newDraftInput !== newDraft) {
                    setSelection((prevSelection) => {
                        const remainder = prevDraft.slice(prevSelection.end).length;
                        return {
                            start: newDraft.length - remainder,
                            end: newDraft.length - remainder,
                        };
                    });
                }
                return newDraft;
            });

            // This component is rendered only when draft is set to a non-empty string. In order to prevent component
            // unmount when user deletes content of textarea, we set previous message instead of empty string.
            if (newDraft.trim().length > 0) {
                // We want to escape the draft message to differentiate the HTML from the report action and the HTML the user drafted.
                debouncedSaveDraft(_.escape(newDraft));
            } else {
                debouncedSaveDraft(props.action.message[0].html);
            }
        },
        [props.action.message, debouncedSaveDraft, debouncedUpdateFrequentlyUsedEmojis, props.preferredSkinTone, props.preferredLocale],
    );

    /**
     * Delete the draft of the comment being edited. This will take the comment out of "edit mode" with the old content.
     */
    const deleteDraft = useCallback(() => {
        console.log(`[wildebug] deleteDraft noaihdaf`);
        // console.log(`[wildebug] isActive ${props.action.message[0].html}`, isActive());
        console.log('[wildebug] isFocused', isFocused)
        console.log('[wildebug] isFocusedRef.current', isFocusedRef.current)
        debouncedSaveDraft.cancel();
        Report.saveReportActionDraft(props.reportID, props.action.reportActionID, '');

        if(isFocusedRef.current)
        {
            console.log('[wildebug] if(isFocusedRef.current) oijoaisdfasf')

            ComposerActions.setShouldShowComposeInput(true);
            ReportActionComposeFocusManager.clear();
            //setIsFocused(false);
        }

        ReportActionComposeFocusManager.focus();

        // Scroll to the last comment after editing to make sure the whole comment is clearly visible in the report.
        if (props.index === 0) {
            const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
                reportScrollManager.scrollToIndex({animated: true, index: props.index}, false);
                keyboardDidHideListener.remove();
            });
        }
    }, [props.action.reportActionID, debouncedSaveDraft, props.index, props.reportID, reportScrollManager]);

    /**
     * Save the draft of the comment to be the new comment message. This will take the comment out of "edit mode" with
     * the new content.
     */
    const publishDraft = useCallback(() => {
        console.log(`[wildebug] publishDraft moaiafsdf`);
        // console.log(`[wildebug] isActive ${props.action.message[0].html}`, isActive());

        // Do nothing if draft exceed the character limit
        if (ReportUtils.getCommentLength(draft) > CONST.MAX_COMMENT_LENGTH) {
            return;
        }

        // To prevent re-mount after user saves edit before debounce duration (example: within 1 second), we cancel
        // debounce here.
        debouncedSaveDraft.cancel();

        const trimmedNewDraft = draft.trim();

        const report = ReportUtils.getReport(props.reportID);

        // Updates in child message should cause the parent draft message to change
        if (report.parentReportActionID && lodashGet(props.action, 'childType', '') === CONST.REPORT.TYPE.CHAT) {
            if (lodashGet(props.drafts, [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${report.parentReportID}_${props.action.reportActionID}`], undefined)) {
                Report.saveReportActionDraft(report.parentReportID, props.action.reportActionID, trimmedNewDraft);
            }
        }
        // Updates in the parent message should cause the child draft message to change
        if (props.action.childReportID) {
            if (lodashGet(props.drafts, [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${props.action.childReportID}_${props.action.reportActionID}`], undefined)) {
                Report.saveReportActionDraft(props.action.childReportID, props.action.reportActionID, trimmedNewDraft);
            }
        }

        // When user tries to save the empty message, it will delete it. Prompt the user to confirm deleting.
        if (!trimmedNewDraft) {
            ReportActionContextMenu.showDeleteModal(props.reportID, props.action, true, deleteDraft, () => {
                // if(!isFocusedRef.current){
                //     return;
                // }

                // InteractionManager.runAfterInteractions(() => textInputRef.current.focus())
            });
            return;
        }
        Report.editReportComment(props.reportID, props.action, trimmedNewDraft);
        deleteDraft();
    }, [props.action, debouncedSaveDraft, deleteDraft, draft, props.reportID, props.drafts]);

    const handleFocus = (shouldDelay) => {
        console.log('[wildebug] ReportActionComposeFocusManager.onComposerFocus((shouldDela')
        if (!textInputRef.current) {
            return;
        }
        console.log('[wildebug] ReportActionComposeFocusManager.onComposerFocus((shouldDela')
        console.log('[wildebug] shouldDelay', shouldDelay)
        ReportActionComposeFocusManager.onComposerFocus(handleFocus);
        setIsFocused(true);
        console.log('[wildebug] reportScrollManager.scrollToIndex({animated ohaosidhfiafeopj')

        ComposerActions.setShouldShowComposeInput(false);
        reportScrollManager.scrollToIndex({animated: true, index: props.index}, true);


        if (shouldDelay) {
            const focus = focusWithDelay(textInputRef.current);
            focus(true);
            return;
        }
        textInputRef.current.focus();
    }

    /**
     * @param {String} emoji
     */
    const addEmojiToTextBox = (emoji) => {
        console.log(`[wildebug] addEmojiToTextBox moijascds`);
        if(!isFocusedRef.current)
        {
            ReportActionComposeFocusManager.onComposerFocus(handleFocus);
        }

        setSelection((prevSelection) => ({
            start: prevSelection.start + emoji.length + CONST.SPACE_LENGTH,
            end: prevSelection.start + emoji.length + CONST.SPACE_LENGTH,
        }));
        updateDraft(ComposerUtils.insertText(draft, selection, `${emoji} `));

    };

    /**
     * Key event handlers that short cut to saving/canceling.
     *
     * @param {Event} e
     */
    const triggerSaveOrCancel = useCallback(
        (e) => {
            console.log('[wildebug] triggerSaveOrCancel')
            if (!e || ComposerUtils.canSkipTriggerHotkeys(isSmallScreenWidth, isKeyboardShown)) {
                return;
            }
            if (e.key === CONST.KEYBOARD_SHORTCUTS.ENTER.shortcutKey && !e.shiftKey) {
                e.preventDefault();
                publishDraft();
            } else if (e.key === CONST.KEYBOARD_SHORTCUTS.ESCAPE.shortcutKey) {
                e.preventDefault();
                deleteDraft();
            }
        },
        [deleteDraft, isKeyboardShown, isSmallScreenWidth, publishDraft],
    );

    /**
     * Focus the composer text input
     */
    const focus = focusWithDelay(textInputRef.current);

    return (
        <>
            <View style={[styles.chatItemMessage, styles.flexRow]}>
                <View style={[styles.justifyContentEnd]}>
                    <Tooltip text={translate('common.cancel')}>
                        <PressableWithFeedback
                            onPress={deleteDraft}
                            style={styles.chatItemSubmitButton}
                            nativeID={cancelButtonID}
                            accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                            accessibilityLabel={translate('common.close')}
                            // disable dimming
                            hoverDimmingValue={1}
                            pressDimmingValue={1}
                            hoverStyle={StyleUtils.getButtonBackgroundColorStyle(CONST.BUTTON_STATES.ACTIVE)}
                            pressStyle={StyleUtils.getButtonBackgroundColorStyle(CONST.BUTTON_STATES.PRESSED)}
                        >
                            {({hovered, pressed}) => (
                                <Icon
                                    src={Expensicons.Close}
                                    fill={StyleUtils.getIconFillColor(getButtonState(hovered, pressed))}
                                />
                            )}
                        </PressableWithFeedback>
                    </Tooltip>
                </View>
                <View
                    style={[
                        isFocused ? styles.chatItemComposeBoxFocusedColor : styles.chatItemComposeBoxColor,
                        styles.flexRow,
                        styles.flex1,
                        styles.chatItemComposeBox,
                        hasExceededMaxCommentLength && styles.borderColorDanger,
                    ]}
                >
                    <View style={containerComposeStyles}>
                        <Composer
                            multiline
                            ref={(el) => {
                                textInputRef.current = el;
                                // eslint-disable-next-line no-param-reassign
                                props.forwardedRef.current = el;
                            }}
                            nativeID={messageEditInput}
                            onChangeText={updateDraft} // Debounced saveDraftComment
                            onKeyPress={triggerSaveOrCancel}
                            value={draft}
                            maxLines={isSmallScreenWidth ? CONST.COMPOSER.MAX_LINES_SMALL_SCREEN : CONST.COMPOSER.MAX_LINES} // This is the same that slack has
                            style={[styles.textInputCompose, styles.flex1, styles.bgTransparent]}
                            onFocus={handleFocus}
                            onBlur={(event) => {
                                console.log(`[wildebug] onBlur nacusodnc`);
                                console.log(`[wildebug] isActive ${props.action.message[0].html}`, isActive());
                                console.log(`[wildebug] event.nativeEvent.target`, event.nativeEvent.target);
                                console.log(`[wildebug] event.nativeEvent.relatedTarget`, event.nativeEvent.relatedTarget);
                                
                                const relatedTargetId = lodashGet(event, 'nativeEvent.relatedTarget.id');

                             

                                // Return to prevent re-render when save/cancel button is pressed which cancels the onPress event by re-rendering
                                if (_.contains([saveButtonID, cancelButtonID], relatedTargetId)) {
                                    console.log('[wildebug] if (_.contains([saveButtonID, cancelButtonID, emojiButtonID], relatedTargetId)) {')
                                    handleFocus();
                                    return;
                                }

                                if (emojiButtonID === relatedTargetId) {
                                    return;
                                }

                                console.log('[wildebug] setIsFocused(false);')
                                setIsFocused(false);

                                if (messageEditInput === relatedTargetId) {
                                    return;
                                }

                                console.log('[wildebug] props.modal iojsidfsdf', props.modal)
                                console.log('[wildebug] openReportActionComposeViewWhenClosingMessageEdit ohaosuidhf')
                                openReportActionComposeViewWhenClosingMessageEdit();
                            }}
                            selection={selection}
                            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                        />
                    </View>
                    <View style={styles.editChatItemEmojiWrapper}>
                        <EmojiPickerButton
                            isDisabled={props.shouldDisableEmojiPicker}
                            // onModalHide={() => {
                            //     if(!isFocusedRef.current){
                            //         return;
                            //     }

                            //     setIsFocused(true);
                            //     focus(true);
                            // }}
                            onEmojiSelected={addEmojiToTextBox}
                            nativeID={emojiButtonID}
                            emojiPickerID={props.action.reportActionID}
                        />
                    </View>

                    <View style={styles.alignSelfEnd}>
                        <Tooltip text={translate('common.saveChanges')}>
                            <PressableWithFeedback
                                style={[styles.chatItemSubmitButton, hasExceededMaxCommentLength ? {} : styles.buttonSuccess]}
                                onPress={()=>{
                                    console.log('[wildebug] onPress jaoischoiahsc')
                                    publishDraft();
                                }}
                                nativeID={saveButtonID}
                                disabled={hasExceededMaxCommentLength}
                                accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                                accessibilityLabel={translate('common.saveChanges')}
                                hoverDimmingValue={1}
                                pressDimmingValue={0.2}
                            >
                                <Icon
                                    src={Expensicons.Checkmark}
                                    fill={hasExceededMaxCommentLength ? themeColors.icon : themeColors.textLight}
                                />
                            </PressableWithFeedback>
                        </Tooltip>
                    </View>
                </View>
            </View>
            <ExceededCommentLength
                comment={draft}
                onExceededMaxCommentLength={(hasExceeded) => setHasExceededMaxCommentLength(hasExceeded)}
            />
        </>
    );
}

ReportActionItemMessageEdit.propTypes = propTypes;
ReportActionItemMessageEdit.defaultProps = defaultProps;
ReportActionItemMessageEdit.displayName = 'ReportActionItemMessageEdit';

export default compose(
    withLocalize,
    withReportActionsDrafts({
        propName: 'drafts',
    }),
    withOnyx({
        modal: {
            key: ONYXKEYS.MODAL,
        },
    }),
)(
    React.forwardRef((props, ref) => (
        <ReportActionItemMessageEdit
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            forwardedRef={ref}
        />
    )),
);

import Button from '@components/ButtonComposed';
import Text from '@components/Text';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {findEmojiByName, hasAccountIDEmojiReacted, mergeReactionsByEmoji} from '@libs/EmojiUtils';

import {toggleEmojiReaction} from '@userActions/EmojiReactions';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction, ReportActionReactions} from '@src/types/onyx';
import {getEmptyObject} from '@src/types/utils/EmptyObject';

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import ActionableItemButtons from './ActionableItemButtons';

/** Names of the two reactions the prompt offers, as stored in the emoji name table. */
const THUMBS_UP_EMOJI_NAME = '+1';
const THUMBS_DOWN_EMOJI_NAME = '-1';

/** How long the frontend-only "Thanks for the feedback!" acknowledgement stays on screen after a thumbs up. */
const THANKS_MESSAGE_TIMEOUT_MS = 5000;

type ConciergeFeedbackPromptProps = {
    /** The Concierge report action this prompt asks for feedback on */
    action: ReportAction;

    /** Report ID for the current report */
    reportID: string | undefined;
};

/**
 * The inline "Was this response useful? 👍 👎" prompt rendered under the most recent Concierge message.
 * Pressing a thumb only adds the matching emoji reaction - the backend derives the feedback from the
 * reaction and opens the feedback thread itself, so there is nothing else for the frontend to do.
 */
function ConciergeFeedbackPrompt({action, reportID}: ConciergeFeedbackPromptProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const [preferredSkinTone = CONST.EMOJI_DEFAULT_SKIN_TONE] = useOnyx(ONYXKEYS.PREFERRED_EMOJI_SKIN_TONE);
    const [emojiReactions = getEmptyObject<ReportActionReactions>()] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_REACTIONS}${action.reportActionID}`);
    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`);

    const [shouldShowThanks, setShouldShowThanks] = useState(false);
    const thanksTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => () => clearTimeout(thanksTimeoutRef.current), []);

    // Collapse the map before reading it: the same reaction can be stored under its legacy name key or under
    // its hexcode, so looking up a single key would miss an existing reaction and bring the prompt back after
    // a reload for those users.
    const mergedReactions = mergeReactionsByEmoji(emojiReactions);
    const hasAlreadyGivenFeedback = [THUMBS_UP_EMOJI_NAME, THUMBS_DOWN_EMOJI_NAME].some((emojiName) => {
        const emoji = findEmojiByName(emojiName);
        const reaction = (emoji?.hexcode ? mergedReactions[emoji.hexcode] : undefined) ?? mergedReactions[emojiName];
        return !!reaction && hasAccountIDEmojiReacted(currentUserAccountID, reaction.users);
    });

    const giveFeedback = (emojiName: string) => {
        const emoji = findEmojiByName(emojiName);
        if (!emoji) {
            return;
        }
        toggleEmojiReaction(reportID, action, emoji, emojiReactions, preferredSkinTone, currentUserAccountID, reportActions);
    };

    // Only the thumbs up gets an acknowledgement. A thumbs down is answered by the feedback thread the
    // backend opens on the message, so acknowledging it here would double up on that.
    const giveThumbsUp = () => {
        giveFeedback(THUMBS_UP_EMOJI_NAME);
        setShouldShowThanks(true);
        clearTimeout(thanksTimeoutRef.current);
        thanksTimeoutRef.current = setTimeout(() => setShouldShowThanks(false), THANKS_MESSAGE_TIMEOUT_MS);
    };

    const giveThumbsDown = () => {
        giveFeedback(THUMBS_DOWN_EMOJI_NAME);
    };

    // The reaction the press adds is the same one the gate reads, so the prompt replaces itself the moment
    // the optimistic reaction lands - no dismissed flag to store, and it stays resolved across reloads.
    if (hasAlreadyGivenFeedback) {
        if (!shouldShowThanks) {
            return null;
        }

        return <Text style={[styles.mt2, styles.textLabelSupporting]}>{translate('concierge.feedback.thanks')}</Text>;
    }

    return (
        <View>
            <Text style={[styles.mt2, styles.textLabelSupporting]}>{translate('concierge.feedback.prompt')}</Text>
            <ActionableItemButtons layout="horizontal">
                <Button
                    onPress={giveThumbsUp}
                    accessibilityLabel={translate('concierge.feedback.useful')}
                >
                    <Button.Text>{findEmojiByName(THUMBS_UP_EMOJI_NAME)?.code}</Button.Text>
                </Button>
                <Button
                    onPress={giveThumbsDown}
                    accessibilityLabel={translate('concierge.feedback.notUseful')}
                >
                    <Button.Text>{findEmojiByName(THUMBS_DOWN_EMOJI_NAME)?.code}</Button.Text>
                </Button>
            </ActionableItemButtons>
        </View>
    );
}

export default ConciergeFeedbackPrompt;

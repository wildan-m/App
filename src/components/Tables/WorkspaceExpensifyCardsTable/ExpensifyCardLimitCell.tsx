import {ModalActions} from '@components/Modal/Global/ModalContext';
import TextInput from '@components/TextInput';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';
import TextWithTooltip from '@components/TextWithTooltip';
import {EditableCell, useInlineEditState} from '@components/TransactionItemRow/EditableCell';

import useConfirmModal from '@hooks/useConfirmModal';
import {useCurrencyListActions} from '@hooks/useCurrencyList';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {updateExpensifyCardLimit} from '@libs/actions/Card';
import {getExpensifyCardAvailableSpendForNewLimit, getExpensifyCardLimitWarningTranslationKey} from '@libs/CardUtils';
import {convertToFrontendAmountAsString, convertToShortDisplayString} from '@libs/CurrencyUtils';

import CONST from '@src/CONST';
import type {Card} from '@src/types/onyx';

import React, {useEffect, useRef} from 'react';

type ExpensifyCardLimitCellProps = {
    /** The card whose limit is shown */
    card: Card;

    /** The fund the card belongs to */
    fundID: number;

    /** Settlement currency of the card */
    currency?: string;

    /** Whether the limit can be edited inline */
    canEdit?: boolean;
};

/**
 * Parses the edited limit the same way the card limit page validates it: a whole amount, not above the card limit cap.
 * Returns the limit in cents, or undefined when the page would have rejected it.
 */
function parseLimit(value: string): number | undefined {
    const trimmedValue = value.trim();
    const limit = Number(trimmedValue);
    if (!trimmedValue || Number.isNaN(limit) || !Number.isInteger(limit) || limit < 0 || limit > CONST.EXPENSIFY_CARD.LIMIT_VALUE) {
        return undefined;
    }
    return limit * 100;
}

function ExpensifyCardLimitCell({card, fundID, currency, canEdit}: ExpensifyCardLimitCellProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {convertToDisplayString} = useCurrencyListActions();
    const {showConfirmModal} = useConfirmModal();
    const inputRef = useRef<BaseTextInputRef | null>(null);

    // Keep the latest card so a confirmation that resolves after the card refreshes still computes spend from current data.
    const cardRef = useRef(card);
    useEffect(() => {
        cardRef.current = card;
    }, [card]);

    const limit = card.nameValuePairs?.unapprovedExpenseLimit ?? 0;

    const updateLimit = (newLimit: number) => {
        const latestCard = cardRef.current;
        updateExpensifyCardLimit(
            fundID,
            latestCard.cardID,
            newLimit,
            getExpensifyCardAvailableSpendForNewLimit(latestCard, newLimit),
            latestCard.nameValuePairs?.unapprovedExpenseLimit,
            latestCard.availableSpend,
            latestCard.nameValuePairs?.isVirtual,
        );
    };

    const saveLimit = (newLimit: number) => {
        if (getExpensifyCardAvailableSpendForNewLimit(cardRef.current, newLimit) > 0) {
            updateLimit(newLimit);
            return;
        }

        showConfirmModal({
            title: translate('workspace.expensifyCard.changeCardLimit'),
            prompt: translate(getExpensifyCardLimitWarningTranslationKey(cardRef.current.nameValuePairs?.limitType), convertToDisplayString(newLimit, currency)),
            confirmText: translate('workspace.expensifyCard.changeLimit'),
            cancelText: translate('common.cancel'),
            buttonVariant: CONST.BUTTON_VARIANT.DANGER,
            shouldEnableNewFocusManagement: true,
        }).then(({action}) => {
            if (action !== ModalActions.CONFIRM) {
                return;
            }
            updateLimit(newLimit);
        });
    };

    const {isEditing, localValue, setLocalValue, startEditing, save, cancelEditing} = useInlineEditState(
        canEdit,
        convertToFrontendAmountAsString(limit, 0),
        (value) => {
            const newLimit = parseLimit(value);
            if (newLimit === undefined) {
                return;
            }
            saveLimit(newLimit);
        },
        (value, originalValue) => parseLimit(value) === parseLimit(originalValue),
    );

    const handleEscape = () => {
        cancelEditing();
        inputRef.current?.blur();
    };

    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.ESCAPE, handleEscape, {captureOnInputs: true, isActive: isEditing});

    return (
        <EditableCell
            canEdit={canEdit}
            isEditing={isEditing}
            onStartEditing={startEditing}
            editIconPosition="left"
            editContent={
                <TextInput
                    ref={inputRef}
                    accessibilityLabel={translate('workspace.card.issueNewCard.limit')}
                    value={localValue}
                    onChangeText={setLocalValue}
                    onBlur={save}
                    onSubmitEditing={save}
                    inputMode={CONST.INPUT_MODE.NUMERIC}
                    autoFocus
                    submitBehavior="blurAndSubmit"
                    // EditableCell is responsible for the cell's hover and focus styles (border, background).
                    // Suppress TextInput's own border and background to avoid visual conflicts.
                    textInputContainerStyles={styles.editableCellInputStyle}
                    touchableInputWrapperStyle={styles.editableCellInputStyle}
                    inputStyle={styles.textAlignRight}
                    hideFocusedState
                    shouldApplyPaddingToContainer={false}
                />
            }
        >
            <TextWithTooltip
                shouldShowTooltip
                numberOfLines={1}
                text={convertToShortDisplayString(limit, currency)}
                style={styles.textAlignRight}
            />
        </EditableCell>
    );
}

export default ExpensifyCardLimitCell;

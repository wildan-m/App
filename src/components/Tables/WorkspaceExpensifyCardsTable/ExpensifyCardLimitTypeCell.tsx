import {ModalActions} from '@components/Modal/Global/ModalContext';
import PopoverMenu from '@components/PopoverMenu';
import type {PopoverMenuItem} from '@components/PopoverMenu';
import TextWithTooltip from '@components/TextWithTooltip';
import {EditableCell, usePopoverEditState} from '@components/TransactionItemRow/EditableCell';

import useConfirmModal from '@hooks/useConfirmModal';
import {useCurrencyListActions} from '@hooks/useCurrencyList';
import useLocalize from '@hooks/useLocalize';

import {updateExpensifyCardLimitType} from '@libs/actions/Card';
import {openPolicyEditCardLimitTypePage} from '@libs/actions/Policy/Policy';
import {
    canSelectFixedExpensifyCardLimitType,
    getExpensifyCardLimitTypeWarningTranslationKey,
    getExpensifyCardValidityDates,
    getTranslationKeyForLimitType,
    shouldConfirmExpensifyCardLimitTypeChange,
} from '@libs/CardUtils';

import CONST from '@src/CONST';
import type {Card} from '@src/types/onyx';
import type {CardLimitType} from '@src/types/onyx/Card';
import type {SelectedTimezone} from '@src/types/onyx/PersonalDetails';

import React, {useEffect, useRef} from 'react';

type ExpensifyCardLimitTypeCellProps = {
    /** The card whose limit type is shown */
    card: Card;

    /** The workspace the card feed belongs to */
    policyID: string;

    /** The fund the card belongs to */
    fundID: number;

    /** Limit type shown when the card has none set */
    defaultLimitType: CardLimitType;

    /** Whether the workspace has approvals configured, which the Smart limit type needs */
    areApprovalsConfigured: boolean;

    /** Timezone of the cardholder, used to keep the card's expiration dates when the limit type changes */
    cardholderTimeZone?: SelectedTimezone;

    /** Settlement currency of the card */
    currency?: string;

    /** Whether the limit type can be edited inline */
    canEdit?: boolean;
};

function ExpensifyCardLimitTypeCell({card, policyID, fundID, defaultLimitType, areApprovalsConfigured, cardholderTimeZone, currency, canEdit}: ExpensifyCardLimitTypeCellProps) {
    const {translate} = useLocalize();
    const {convertToDisplayString} = useCurrencyListActions();
    const {showConfirmModal} = useConfirmModal();

    // Keep the latest card so a confirmation that resolves after the card refreshes still sends current data.
    const cardRef = useRef(card);
    useEffect(() => {
        cardRef.current = card;
    }, [card]);

    const limitType = card.nameValuePairs?.limitType ?? defaultLimitType;

    const updateLimitType = (newLimitType: CardLimitType) => {
        const latestCard = cardRef.current;
        const {validFrom, validThru} = getExpensifyCardValidityDates(latestCard, cardholderTimeZone);

        // Keep any existing expiration dates, and only clear them when the card has none, like the limit type page does.
        updateExpensifyCardLimitType(fundID, latestCard.cardID, newLimitType, cardholderTimeZone, latestCard.nameValuePairs, validFrom, validThru, !latestCard.nameValuePairs?.validFrom);
    };

    const saveLimitType = (newLimitType: CardLimitType) => {
        const latestCard = cardRef.current;
        if (!shouldConfirmExpensifyCardLimitTypeChange(latestCard, limitType, newLimitType)) {
            updateLimitType(newLimitType);
            return;
        }

        showConfirmModal({
            title: translate('workspace.expensifyCard.changeCardLimitType'),
            prompt: translate(getExpensifyCardLimitTypeWarningTranslationKey(limitType), convertToDisplayString(latestCard.nameValuePairs?.unapprovedExpenseLimit, currency)),
            confirmText: translate('workspace.expensifyCard.changeLimitType'),
            cancelText: translate('common.cancel'),
            buttonVariant: CONST.BUTTON_VARIANT.DANGER,
            shouldEnableNewFocusManagement: true,
        }).then(({action}) => {
            if (action !== ModalActions.CONFIRM) {
                return;
            }
            updateLimitType(newLimitType);
        });
    };

    const {isEditing, anchorRef, isPopoverVisible, popoverPosition, startEditing, cancelEditing, handleSave} = usePopoverEditState<CardLimitType>({
        canEdit,
        value: limitType,
        onSave: saveLimitType,
    });

    const handleStartEditing = () => {
        // The card's unapproved and total spend, which the options and the confirmation depend on, are only loaded by this call.
        openPolicyEditCardLimitTypePage(policyID, card.cardID);
        startEditing();
    };

    const getMenuItem = (value: CardLimitType, description: string, isDisabled = false): PopoverMenuItem => ({
        text: translate(getTranslationKeyForLimitType(value)),
        description,
        isSelected: limitType === value,
        disabled: isDisabled,
        shouldCallAfterModalHide: true,
        onSelected: () => handleSave(value),
    });

    const menuItems: PopoverMenuItem[] = [
        getMenuItem(CONST.EXPENSIFY_CARD.LIMIT_TYPES.SMART, translate('workspace.card.issueNewCard.smartLimitDescription'), !areApprovalsConfigured),
        getMenuItem(CONST.EXPENSIFY_CARD.LIMIT_TYPES.MONTHLY, translate('workspace.card.issueNewCard.monthlyDescription')),
    ];
    if (canSelectFixedExpensifyCardLimitType(card, limitType)) {
        menuItems.push(getMenuItem(CONST.EXPENSIFY_CARD.LIMIT_TYPES.FIXED, translate('workspace.card.issueNewCard.fixedAmountDescription')));
    }
    if (card.nameValuePairs?.isVirtual) {
        menuItems.push(getMenuItem(CONST.EXPENSIFY_CARD.LIMIT_TYPES.SINGLE_USE, translate('workspace.card.issueNewCard.singleUseDescription')));
    }

    return (
        <EditableCell
            canEdit={canEdit}
            isEditing={isEditing}
            onStartEditing={handleStartEditing}
            anchorRef={anchorRef}
            popoverContent={
                <PopoverMenu
                    isVisible={isPopoverVisible}
                    onClose={cancelEditing}
                    anchorRef={anchorRef}
                    anchorPosition={popoverPosition}
                    anchorAlignment={{
                        horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT,
                        vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP,
                    }}
                    menuItems={menuItems}
                    shouldSwitchPositionIfOverflow
                    shouldEnableNewFocusManagement
                    enableEdgeToEdgeBottomSafeAreaPadding
                />
            }
        >
            <TextWithTooltip
                shouldShowTooltip
                numberOfLines={1}
                text={translate(getTranslationKeyForLimitType(card.nameValuePairs?.limitType))}
            />
        </EditableCell>
    );
}

export default ExpensifyCardLimitTypeCell;

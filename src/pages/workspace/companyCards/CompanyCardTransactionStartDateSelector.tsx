import Button from '@components/Button';
import DatePicker from '@components/DatePicker';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

import {format, parseISO} from 'date-fns';
import React, {useState} from 'react';
import {View} from 'react-native';

type DateOption = ValueOf<typeof CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS>;

type CompanyCardTransactionStartDateSelectorProps = {
    /** Copy shown above the two date options */
    description: string;

    /** The start date currently saved, if there is a single one to prefill from */
    currentStartDate?: string;

    /** Called with the new start date, which is an empty string for "From the beginning" */
    onSubmit: (newStartDate: string) => void;
};

function CompanyCardTransactionStartDateSelector({description, currentStartDate, onSubmit}: CompanyCardTransactionStartDateSelectorProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const savedDateOption = currentStartDate ? CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM : CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING;

    const [localDateOption, setLocalDateOption] = useState<DateOption | undefined>(undefined);
    const dateOptionSelected = localDateOption ?? savedDateOption;

    const [startDate, setStartDate] = useState(() => {
        if (currentStartDate) {
            return format(parseISO(currentStartDate), CONST.DATE.FNS_FORMAT_STRING);
        }
        return format(new Date(), CONST.DATE.FNS_FORMAT_STRING);
    });

    const [errorText, setErrorText] = useState('');

    const handleSelectDateOption = (dateOption: DateOption) => {
        setErrorText('');
        setLocalDateOption(dateOption);
        if (dateOption === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING) {
            return;
        }
        // Reset to current date when switching to custom
        if (!currentStartDate) {
            setStartDate(format(new Date(), CONST.DATE.FNS_FORMAT_STRING));
        }
    };

    const submit = () => {
        if (dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM && !isRequiredFulfilled(startDate)) {
            setErrorText(translate('common.error.fieldRequired'));
            return;
        }

        onSubmit(dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING ? '' : startDate);
    };

    const dateOptions = [
        {
            value: CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING,
            text: translate('workspace.companyCards.fromTheBeginning'),
            keyForList: CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING,
            isSelected: dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING,
        },
        {
            value: CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM,
            text: translate('workspace.companyCards.customStartDate'),
            keyForList: CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM,
            isSelected: dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM,
        },
    ];

    return (
        <>
            <Text style={[styles.textSupporting, styles.ph5, styles.mv3]}>{description}</Text>
            <View style={styles.flex1}>
                <SelectionList
                    ListItem={SingleSelectListItem}
                    onSelectRow={({value}) => handleSelectDateOption(value)}
                    data={dateOptions}
                    shouldSingleExecuteRowSelect
                    initiallyFocusedItemKey={dateOptionSelected}
                    shouldUpdateFocusedIndex
                    addBottomSafeAreaPadding
                    footerContent={
                        <Button
                            variant={CONST.BUTTON_VARIANT.SUCCESS}
                            size={CONST.BUTTON_SIZE.LARGE}
                            onPress={submit}
                        >
                            <Button.KeyboardShortcut />
                            <Button.Text>{translate('common.save')}</Button.Text>
                        </Button>
                    }
                    listFooterContent={
                        dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM ? (
                            <View style={[styles.ph5]}>
                                <DatePicker
                                    inputID=""
                                    value={startDate}
                                    label={translate('iou.startDate')}
                                    onInputChange={(value) => {
                                        if (!isRequiredFulfilled(value)) {
                                            setErrorText(translate('common.error.fieldRequired'));
                                        } else {
                                            setErrorText('');
                                        }
                                        setStartDate(value);
                                    }}
                                    minDate={CONST.CALENDAR_PICKER.MIN_DATE}
                                    errorText={errorText}
                                />
                            </View>
                        ) : null
                    }
                />
            </View>
        </>
    );
}

export default CompanyCardTransactionStartDateSelector;

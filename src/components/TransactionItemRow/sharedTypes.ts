import type {TransactionWithOptionalHighlight} from '@components/MoneyRequestReportView/MoneyRequestReportTransactionList';
import type {CardList, PersonalDetails, Policy, Report, TransactionViolation} from '@src/types/onyx';
import type {SearchTransactionAction} from '@src/types/onyx/SearchResults';

type TransactionWithOptionalSearchFields = TransactionWithOptionalHighlight & {
    /** The action that can be performed for the transaction */
    action?: SearchTransactionAction;

    /** Function passed to the action button, triggered when the button is pressed */
    onButtonPress?: () => void;

    /** The personal details of the user requesting money */
    from?: PersonalDetails;

    /** The personal details of the user paying the request */
    to?: PersonalDetails;

    /** The date the report was exported */
    exported?: string;

    /** formatted "to" value used for displaying and sorting on Reports page */
    formattedTo?: string;

    /** formatted "from" value used for displaying and sorting on Reports page */
    formattedFrom?: string;

    /** formatted "merchant" value used for displaying and sorting on Reports page */
    formattedMerchant?: string;

    /** information about whether to show merchant, that is provided on Reports page */
    shouldShowMerchant?: boolean;

    /** information about whether to show the description, that is provided on Reports page */
    shouldShowDescription?: boolean;

    /** Precomputed violations */
    violations?: TransactionViolation[];

    /** Used to initiate payment from search page */
    hash?: number;

    /** Report to which the transaction belongs */
    report?: Report;

    /** Policy to which the transaction belongs */
    policy?: Policy;
};

export type {TransactionWithOptionalSearchFields, CardList};

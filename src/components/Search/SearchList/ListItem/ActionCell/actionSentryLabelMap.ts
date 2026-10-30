import CONST from '@src/CONST';
import type {SearchTransactionAction} from '@src/types/onyx/SearchResults';

/**
 * Sentry labels for the actions rendered by the generic action button, so INP can be told apart per action while the
 * shared `Search-ActionCellAction` prefix still groups them under one `inp.category`.
 */
const actionSentryLabelMap: Partial<Record<SearchTransactionAction, string>> = {
    [CONST.SEARCH.ACTION_TYPES.SUBMIT]: CONST.SENTRY_LABEL.SEARCH.ACTION_CELL_SUBMIT,
    [CONST.SEARCH.ACTION_TYPES.CHANGE_APPROVER]: CONST.SENTRY_LABEL.SEARCH.ACTION_CELL_CHANGE_APPROVER,
    [CONST.SEARCH.ACTION_TYPES.EXPORT_TO_ACCOUNTING]: CONST.SENTRY_LABEL.SEARCH.ACTION_CELL_EXPORT_TO_ACCOUNTING,
    [CONST.SEARCH.ACTION_TYPES.UNDELETE]: CONST.SENTRY_LABEL.SEARCH.ACTION_CELL_UNDELETE,
};

export default actionSentryLabelMap;

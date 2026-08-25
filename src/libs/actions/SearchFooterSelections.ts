import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchFooterSelection} from '@src/types/onyx/SearchFooterSelections';

import Onyx from 'react-native-onyx';

/**
 * Persist a Search footer selection (count, total, or currency) for one search type. Each search type keeps its own
 * entry, so a choice made on `type:expense-report` results does not carry over to `type:expense` results.
 */
function setSearchFooterSelection(searchType: string, selection: SearchFooterSelection) {
    Onyx.merge(ONYXKEYS.NVP_SEARCH_FOOTER_SELECTIONS, {[searchType]: selection});
}

export default {setSearchFooterSelection};

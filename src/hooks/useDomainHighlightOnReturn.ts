import type {TableData, TableHandle} from '@components/Table';

import {clearDomainHighlightItems} from '@libs/actions/Domain';

import ONYXKEYS from '@src/ONYXKEYS';
import type {DomainHighlightItemType} from '@src/types/onyx/DomainHighlightItems';

import type {RefObject} from 'react';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef, useState} from 'react';

import useOnyx from './useOnyx';

/**
 * Scrolls to and highlights a domain admin/member/group row after it was just added, by reading the
 * pending highlight flag set optimistically in `Domain.ts` and consuming it once the row is visible.
 * If the row is currently hidden by an active search/filter, that search/filter is cleared once so the
 * row is revealed, then it is scrolled to and highlighted.
 */
function useDomainHighlightOnReturn<DataType extends TableData, ColumnKey extends string = string, FilterKey extends string = string>(
    domainAccountID: number,
    type: DomainHighlightItemType,
    tableRef: RefObject<TableHandle<DataType, ColumnKey, FilterKey> | null>,
) {
    const isFocused = useIsFocused();
    const [highlightItems] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_HIGHLIGHT_ITEMS}${domainAccountID}`);
    const highlightKey = highlightItems?.type === type ? highlightItems.id : null;

    // Tracks the key we already tried to reveal by clearing the active search/filter, so the reveal is
    // attempted at most once per key and never loops if the row is genuinely absent from the data.
    const revealAttemptedForKeyRef = useRef<string | null>(null);
    // Bumped after clearing the search/filter to re-run the effect against the freshly-processed data.
    const [revealAttempt, setRevealAttempt] = useState(0);

    useEffect(() => {
        if (!isFocused || !highlightKey) {
            return;
        }

        const table = tableRef.current;
        const processedData = table?.getProcessedData() ?? [];
        const index = processedData.findIndex((item) => item.keyForList === highlightKey);

        if (index === -1) {
            // The target row is missing from the processed data. If an active search or filter is hiding
            // it, clear them once so the row is revealed and re-run to highlight it. Only fall back to
            // dropping the highlight if the row is still absent after the search/filter were cleared.
            const activeSearchString = table?.getActiveSearchString() ?? '';
            const activeFilters = table?.getActiveFilters() ?? ({} as Record<FilterKey, string[]>);
            const activeFilterKeys = (Object.keys(activeFilters) as FilterKey[]).filter((key) => (activeFilters[key]?.length ?? 0) > 0);
            const hasActiveSearchOrFilter = activeSearchString !== '' || activeFilterKeys.length > 0;

            if (hasActiveSearchOrFilter && revealAttemptedForKeyRef.current !== highlightKey) {
                revealAttemptedForKeyRef.current = highlightKey;

                if (activeSearchString !== '') {
                    table?.updateSearchString('');
                }
                activeFilterKeys.forEach((key) => table?.updateFilter({key, value: []}));

                setRevealAttempt((attempt) => attempt + 1);
                return;
            }

            clearDomainHighlightItems(domainAccountID);
            return;
        }

        revealAttemptedForKeyRef.current = null;
        table?.scrollToIndex({index, animated: false});
        table?.highlightItems([highlightKey]);
        clearDomainHighlightItems(domainAccountID);
    }, [isFocused, highlightKey, domainAccountID, tableRef, revealAttempt]);
}

export default useDomainHighlightOnReturn;

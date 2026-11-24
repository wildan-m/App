import type {ExpensifyIconName} from '@components/Icon/ExpensifyIconLoader';

import type {SearchKey} from '@libs/SearchKeyUtils';
import type {SearchTypeMenuItem} from '@libs/SearchSuggestionUtils';
import type {getSavedSearchIconName} from '@libs/SearchUIUtils';

import type CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';
import type {SentryLabel} from '@src/types/utils/SentryLabel';

import type {ValueOf} from 'type-fest';

import type FLAT_NAV from './FLAT_NAV';

/** Identifier of a top-level flat nav section. Stable, unlike its translation path. */
type FlatNavSectionID = ValueOf<typeof FLAT_NAV.SECTION>;

/** A suggested (canned) search key. Saved search keys are not part of it. */
type FlatNavCannedSearchKey = ValueOf<typeof CONST.SEARCH.SEARCH_KEYS>;

type FlatNavSavedSearchIconName = ReturnType<typeof getSavedSearchIconName>;

/** Static description of a section: what it contains, in render order. */
type FlatNavSectionDefinition = {
    id: FlatNavSectionID;

    /** Label of the section row, the More entry and the narrow header */
    translationPath: TranslationPaths;

    /** Icon for surfaces rendered in JS (web bar, mWeb, More popover). Native tab glyphs are mapped separately. */
    iconName: ExpensifyIconName;

    /** Canned search keys in render order. Empty for the Saved section, whose items come from the user's saved searches. */
    searchKeys: readonly FlatNavCannedSearchKey[];
};

type FlatNavCannedSearchItem = {
    type: typeof FLAT_NAV.ITEM_TYPE.CANNED_SEARCH;
    key: FlatNavCannedSearchKey;
    sectionID: FlatNavSectionID;

    /** Label as it reads inside its section, e.g. `reports` reads "My reports" under Reports */
    translationPath: TranslationPaths;

    /** Label as the Spend column reads it, for lists that mirror the column */
    spendColumnTranslationPath: TranslationPaths;
    iconName: SearchTypeMenuItem['icon'];

    /** Default query. Navigation prefers the last valid query the user left this search with. */
    searchQuery: string;

    /** Undefined when the search has no todo badge or its count is 0 */
    badgeText?: string;
};

type FlatNavSavedSearchItem = {
    type: typeof FLAT_NAV.ITEM_TYPE.SAVED_SEARCH;

    /** `savedSearch_<savedSearchID>` */
    key: SearchKey;
    sectionID: typeof FLAT_NAV.SECTION.SAVED;
    savedSearchID: string;
    name: string;

    /** Human readable title. Differs from `name` only when the saved search was never renamed. */
    title: string;

    /** The saved query, not the last one the user left it with */
    query: string;
    iconName: FlatNavSavedSearchIconName;

    /** Offline change not yet synced (add, rename or delete), so the row can be greyed out like in the Spend column */
    pendingAction?: PendingAction | null;

    /** Pending delete */
    isDisabled: boolean;
};

type FlatNavItem = FlatNavCannedSearchItem | FlatNavSavedSearchItem;

/** Identifier of a page row that fronts several searches, such as Month end close. Not a search key. */
type FlatNavPageKey = ValueOf<typeof FLAT_NAV.PAGE>;

/** A subnav row standing in for the searches of its group, which the page it opens shows as tabs */
type FlatNavPageItem = {
    type: typeof FLAT_NAV.ITEM_TYPE.PAGE;
    key: FlatNavPageKey;

    /** Translation key of the row label and the title of the page */
    translationPath: TranslationPaths;
    sentryLabel: SentryLabel;

    /** The visible searches the page fronts, in render order. Never empty, because the row is dropped with them. */
    memberItems: FlatNavCannedSearchItem[];

    /** Todo count of all the members together, like the badge of their section. Undefined when there is none. */
    badgeText?: string;
};

/** A row of the subnav: a search, or a page fronting several of them */
type FlatNavSubnavRow = FlatNavItem | FlatNavPageItem;

/** A section the user can see, holding only the items they can see */
type FlatNavSection = {
    id: FlatNavSectionID;
    translationPath: TranslationPaths;
    iconName: ExpensifyIconName;
    items: FlatNavItem[];

    /** Todo count of the whole section, for when its items are hidden. Undefined when the section has no todo items or its count is 0. */
    badgeText?: string;
};

type ActiveFlatNavItem = {
    sectionID: FlatNavSectionID;

    /** Undefined when the search belongs to the section but has no visible row, e.g. a deleted saved search */
    itemKey: SearchKey | undefined;
};

type FlatNavSubnavGroupID = ValueOf<typeof FLAT_NAV.SUBNAV_GROUP>;

/** Static description of a subnav header: which sections list their items under it, and how their rows are labelled there. */
type FlatNavSubnavGroupDefinition = {
    id: FlatNavSubnavGroupID;

    /** Translation key of the header label */
    translationPath: TranslationPaths;

    /** Sections whose items are listed under the header, in render order */
    sectionIDs: readonly FlatNavSectionID[];

    /** Whether canned searches read as in the Spend column, where the wording of their own section would not fit */
    shouldUseSpendColumnLabels?: boolean;

    /** When set, the group's visible searches collapse into one page row that fronts them as tabs, as Accounting's Month end close */
    collapsedPage?: {
        key: FlatNavPageKey;
        translationPath: TranslationPaths;
        sentryLabel: SentryLabel;
    };
};

/** A header with the rows under it, as the subnav draws them */
type FlatNavSubnavGroup = {
    id: FlatNavSubnavGroupID;
    translationPath: TranslationPaths;
    items: FlatNavSubnavRow[];
};

/** Heights of the subnav's rows, which are fixed so the marker's position can be worked out without measuring */
type FlatNavSubnavRowHeights = {
    header: number;
    item: number;
    marker: number;
};

export type {
    ActiveFlatNavItem,
    FlatNavCannedSearchItem,
    FlatNavCannedSearchKey,
    FlatNavItem,
    FlatNavPageItem,
    FlatNavPageKey,
    FlatNavSavedSearchIconName,
    FlatNavSavedSearchItem,
    FlatNavSection,
    FlatNavSectionDefinition,
    FlatNavSectionID,
    FlatNavSubnavGroup,
    FlatNavSubnavGroupDefinition,
    FlatNavSubnavRow,
    FlatNavSubnavRowHeights,
};

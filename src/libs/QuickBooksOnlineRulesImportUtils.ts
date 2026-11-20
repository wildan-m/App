import type {ImportedMerchantRule} from '@libs/actions/Policy/Rules';
import {getExpenseDefaultFormValues, getPolicyExpenseDefaultRules} from '@libs/ExpenseDefaultRuleUtils';
import type {ExpenseDefaultFormValues} from '@libs/ExpenseDefaultRuleUtils';
import Parser from '@libs/Parser';
import {escapeTagName, getCleanedTagName, getTagLists} from '@libs/PolicyUtils';
import {trimTag} from '@libs/TagUtils';

import {buildImportedCategoryLookup, buildImportedVendorLookup, getRuleContentKey} from '@pages/workspace/rules/MerchantRules/ImportedMerchantRulesPage';

import CONST from '@src/CONST';
import type {ImportedSpreadsheet, Policy, PolicyCategories, PolicyTagLists, PolicyVendors, Rule} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

/** Column headers of the rules file QuickBooks Online exports from Accounting > Rules > Export rules */
const QBO_RULES_COLUMN = {
    NAME: 'rule name',
    CONDITIONS: 'rule conditions',
    OUTPUTS: 'rule outputs',
} as const;

/** QuickBooks Online condition codes (`ruleType`) */
const QBO_CONDITION = {
    AMOUNT_EQUALS: 2,
    AMOUNT_GREATER_THAN: 3,
    AMOUNT_LESS_THAN: 4,
    DESCRIPTION_CONTAINS: 6,
    DESCRIPTION_DOES_NOT_CONTAIN: 8,
    DIRECTION: 10,
    DESCRIPTION_IS_EXACTLY: 13,
} as const;

/** The direction value of a money-in rule. Money out is `-1`. */
const QBO_DIRECTION_MONEY_IN = '1';

/** QuickBooks Online action codes (`actionType`) */
const QBO_ACTION = {
    CATEGORY: 0,
    MEMO_REPLACE: 1,
    CLASS: 2,
    LOCATION: 3,
    PAYEE: 5,
    SPLIT: 6,
    TRANSACTION_TYPE: 7,
    AUTO_ADD: 8,
    MEMO_APPEND: 9,
    EXCLUDE: 12,
    CUSTOMER: 14,
    PRODUCT_SERVICE: 16,
} as const;

/** Why a QuickBooks Online rule was not imported at all */
type QuickBooksOnlineRuleSkipReason =
    | 'unreadable'
    | 'doesNotContain'
    | 'amountCondition'
    | 'moneyIn'
    | 'noMerchantCondition'
    | 'multipleMerchantConditions'
    | 'unsupportedCondition'
    | 'split'
    | 'exclude'
    | 'nothingToSet';

/** A QuickBooks Online setting that an imported rule could not carry over */
type QuickBooksOnlineDroppedSetting = 'amountCondition' | 'category' | 'vendor' | 'class' | 'customer' | 'location' | 'productService' | 'unknownSetting';

/** Why a setting was dropped from an imported rule */
type QuickBooksOnlineDroppedSettingReason = 'unsupported' | 'notFound' | 'unavailable' | 'reportField' | 'notImported';

type QuickBooksOnlineSkippedRule = {
    /** The `Rule Name` cell of the skipped row */
    name: string;

    /** Why the row was skipped */
    reason: QuickBooksOnlineRuleSkipReason;
};

type QuickBooksOnlineDroppedSettingCount = {
    /** The setting that was not set */
    setting: QuickBooksOnlineDroppedSetting;

    /** Why it was not set */
    reason: QuickBooksOnlineDroppedSettingReason;

    /** How many QuickBooks Online rules lost this setting */
    count: number;
};

type ConvertedQuickBooksOnlineRules = {
    /** The rules to send to ImportMerchantRulesSpreadsheet, keyed by ascending IDs so the top row of the file wins */
    rules: Record<string, ImportedMerchantRule>;

    /** The rows that were not imported, with the reason */
    skippedRules: QuickBooksOnlineSkippedRule[];

    /** The settings that were not set, aggregated per setting and reason */
    droppedSettings: QuickBooksOnlineDroppedSettingCount[];

    /** How many imported QuickBooks Online rules lost at least one setting */
    rulesWithDroppedSettingsCount: number;

    /** How many converted rules were left out because the workspace, or an earlier row, already has the same rule */
    duplicateCount: number;
};

type QuickBooksOnlineRuleRow = {
    name: string;
    conditions: string;
    outputs: string;
};

type QuickBooksOnlineCondition = {
    ruleType?: number;
    value?: unknown;
};

type QuickBooksOnlineAction = {
    actionType?: number;
    value?: unknown;
};

type TagDimension = {
    setting: Extract<QuickBooksOnlineDroppedSetting, 'class' | 'customer' | 'location'>;
    configKey: 'syncClasses' | 'syncCustomers' | 'syncLocations';
    tagListNames: string[];
};

const TAG_DIMENSION_BY_ACTION: Record<number, TagDimension> = {
    [QBO_ACTION.CLASS]: {setting: 'class', configKey: 'syncClasses', tagListNames: ['Classes']},
    [QBO_ACTION.CUSTOMER]: {setting: 'customer', configKey: 'syncCustomers', tagListNames: ['Customers/Projects', 'Customers/Jobs']},
    [QBO_ACTION.LOCATION]: {setting: 'location', configKey: 'syncLocations', tagListNames: ['Locations']},
};

/** Rule IDs are drawn from 18-digit numbers so every generated ID has the same length and stays below 2^63 */
const RULE_ID_MIN = 100000000000000000n;
const RULE_ID_RANGE = 800000000000000000n;

/**
 * Reads the rows of an uploaded QuickBooks Online rules file. The columns are found by their header, so the file
 * doesn't need to be mapped. Returns undefined when the sheet isn't a QuickBooks Online rules export.
 */
function getQuickBooksOnlineRuleRows(spreadsheet: OnyxEntry<ImportedSpreadsheet>): QuickBooksOnlineRuleRow[] | undefined {
    const columns = spreadsheet?.data ?? [];
    const findColumn = (header: string) => columns.findIndex((column) => column.at(0)?.toString().trim().toLowerCase() === header);
    const nameColumn = findColumn(QBO_RULES_COLUMN.NAME);
    const conditionsColumn = findColumn(QBO_RULES_COLUMN.CONDITIONS);
    const outputsColumn = findColumn(QBO_RULES_COLUMN.OUTPUTS);
    if (conditionsColumn === -1 || outputsColumn === -1) {
        return undefined;
    }

    const rowCount = Math.max(columns.at(conditionsColumn)?.length ?? 0, columns.at(outputsColumn)?.length ?? 0);
    const getCell = (columnIndex: number, rowIndex: number) => (columnIndex === -1 ? '' : (columns.at(columnIndex)?.at(rowIndex)?.toString().trim() ?? ''));

    const rows: QuickBooksOnlineRuleRow[] = [];
    // Row 0 is the header
    for (let rowIndex = 1; rowIndex < rowCount; rowIndex++) {
        rows.push({
            name: getCell(nameColumn, rowIndex),
            conditions: getCell(conditionsColumn, rowIndex),
            outputs: getCell(outputsColumn, rowIndex),
        });
    }
    return rows;
}

function parseJSONCell<T>(cell: string): T | undefined {
    try {
        return JSON.parse(cell) as T;
    } catch {
        return undefined;
    }
}

/**
 * Generates `count` same-length, ascending rule IDs. Auth applies rules with the same priority and timestamp in
 * ID order and the last one wins, so the caller gives the highest ID to the top row of the file.
 */
function generateAscendingRuleIDs(count: number, random: () => number = Math.random): string[] {
    const usableRange = RULE_ID_RANGE - BigInt(count);
    const base = RULE_ID_MIN + (BigInt(Math.floor(random() * Number.MAX_SAFE_INTEGER)) % usableRange);
    return Array.from({length: count}, (_, index) => (base + BigInt(index)).toString());
}

/** Finds the escaped tag name a rule should store for a QuickBooks Online value, or undefined when the tag list doesn't have it */
function findTagName(tags: ReturnType<typeof getTagLists>[number]['tags'], value: string): string | undefined {
    const normalizedValue = value.trim().toLowerCase();
    for (const tag of Object.values(tags ?? {})) {
        if (tag.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
            continue;
        }
        if (getCleanedTagName(tag.name).trim().toLowerCase() === normalizedValue) {
            // A QuickBooks Online sub-class such as `Parent:Child` is one tag, so its colon is escaped rather than read as a level separator
            return escapeTagName(tag.name);
        }
    }
    return undefined;
}

/**
 * Converts the rows of a QuickBooks Online rules export into merchant rules. Only what the QuickBooks Online rule sets
 * is set, and a rule that would match more expenses than the QuickBooks Online rule did is skipped.
 */
function convertQuickBooksOnlineRules({
    rows,
    policy,
    policyCategories,
    policyTagLists,
    policyVendors,
    existingRules,
    isVendorFeatureAvailable,
    isVendorListReady,
    random,
}: {
    rows: QuickBooksOnlineRuleRow[];
    policy: OnyxEntry<Policy>;
    policyCategories: OnyxEntry<PolicyCategories>;
    policyTagLists: OnyxEntry<PolicyTagLists>;
    policyVendors?: OnyxEntry<PolicyVendors>;
    existingRules: OnyxCollection<Rule>;
    isVendorFeatureAvailable: boolean;
    isVendorListReady: boolean;
    random?: () => number;
}): ConvertedQuickBooksOnlineRules {
    const categoryLookup = buildImportedCategoryLookup(policyCategories);
    const vendorLookup = buildImportedVendorLookup(policy, policyVendors);
    const tagLists = getTagLists(policyTagLists);
    const qboConfig = policy?.connections?.quickbooksOnline?.config;

    const seenRuleKeys = new Set(
        getPolicyExpenseDefaultRules(existingRules, policy?.id)
            .filter(({rule}) => rule.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE)
            .map(({rule}) => getExpenseDefaultFormValues(rule))
            .filter((formValues) => !!formValues)
            .map(getRuleContentKey),
    );

    const skippedRules: QuickBooksOnlineSkippedRule[] = [];
    const droppedSettingCounts = new Map<string, QuickBooksOnlineDroppedSettingCount>();
    let rulesWithDroppedSettingsCount = 0;
    let duplicateCount = 0;
    // Kept in file order: the first entry belongs to the top row
    const orderedRules: ImportedMerchantRule[] = [];

    for (const row of rows) {
        const skip = (reason: QuickBooksOnlineRuleSkipReason) => skippedRules.push({name: row.name, reason});

        const parsedConditions = parseJSONCell<{ruleConditions?: QuickBooksOnlineCondition[]; isAndRule?: boolean}>(row.conditions);
        const parsedOutputs = parseJSONCell<{ruleActions?: QuickBooksOnlineAction[]}>(row.outputs);
        if (!Array.isArray(parsedConditions?.ruleConditions) || !Array.isArray(parsedOutputs?.ruleActions)) {
            if (row.conditions || row.outputs) {
                skip('unreadable');
            }
            continue;
        }

        const isAnyRule = parsedConditions.isAndRule === false;
        const droppedSettings: Array<Pick<QuickBooksOnlineDroppedSettingCount, 'setting' | 'reason'>> = [];

        // Conditions
        const merchantFilters: Array<{operator: string; value: string}> = [];
        let conditionSkipReason: QuickBooksOnlineRuleSkipReason | undefined;
        let hasAmountCondition = false;
        for (const condition of parsedConditions.ruleConditions) {
            const value = typeof condition.value === 'string' || typeof condition.value === 'number' ? String(condition.value).trim() : '';
            switch (condition.ruleType) {
                case QBO_CONDITION.DIRECTION:
                    if (value === QBO_DIRECTION_MONEY_IN) {
                        conditionSkipReason ??= 'moneyIn';
                    }
                    break;
                case QBO_CONDITION.DESCRIPTION_CONTAINS:
                case QBO_CONDITION.DESCRIPTION_IS_EXACTLY:
                    if (value) {
                        merchantFilters.push({
                            operator: condition.ruleType === QBO_CONDITION.DESCRIPTION_IS_EXACTLY ? CONST.SEARCH.SYNTAX_OPERATORS.EQUAL_TO : CONST.SEARCH.SYNTAX_OPERATORS.CONTAINS,
                            value,
                        });
                    }
                    break;
                case QBO_CONDITION.DESCRIPTION_DOES_NOT_CONTAIN:
                    conditionSkipReason ??= 'doesNotContain';
                    break;
                case QBO_CONDITION.AMOUNT_EQUALS:
                case QBO_CONDITION.AMOUNT_GREATER_THAN:
                case QBO_CONDITION.AMOUNT_LESS_THAN:
                    hasAmountCondition = true;
                    break;
                default:
                    conditionSkipReason ??= 'unsupportedCondition';
            }
        }

        if (!conditionSkipReason && hasAmountCondition) {
            // Dropping an "All" condition widens the rule. Dropping an "Any" branch only narrows it, as long as a merchant branch is left.
            if (isAnyRule && merchantFilters.length > 0) {
                droppedSettings.push({setting: 'amountCondition', reason: 'unsupported'});
            } else {
                conditionSkipReason = 'amountCondition';
            }
        }
        if (!conditionSkipReason && merchantFilters.length === 0) {
            conditionSkipReason = 'noMerchantCondition';
        }
        if (!conditionSkipReason && !isAnyRule && merchantFilters.length > 1) {
            // One merchant filter per rule can't require two descriptions at once, and keeping only one would match more expenses
            conditionSkipReason = 'multipleMerchantConditions';
        }
        if (conditionSkipReason) {
            skip(conditionSkipReason);
            continue;
        }

        // Actions
        let actionSkipReason: QuickBooksOnlineRuleSkipReason | undefined;
        let category = '';
        let vendorID = '';
        const commentParts: string[] = [];
        const tagLevels: string[] = [];
        for (const action of parsedOutputs.ruleActions) {
            const value = typeof action.value === 'string' || typeof action.value === 'number' ? String(action.value).trim() : '';
            const tagDimension = action.actionType === undefined ? undefined : TAG_DIMENSION_BY_ACTION[action.actionType];
            if (tagDimension) {
                if (!value) {
                    continue;
                }
                const syncSetting = qboConfig?.[tagDimension.configKey];
                if (syncSetting === CONST.INTEGRATION_ENTITY_MAP_TYPES.REPORT_FIELD) {
                    droppedSettings.push({setting: tagDimension.setting, reason: 'reportField'});
                    continue;
                }
                const tagList = syncSetting === CONST.INTEGRATION_ENTITY_MAP_TYPES.TAG ? tagLists.find(({name}) => tagDimension.tagListNames.includes(name)) : undefined;
                if (!tagList) {
                    droppedSettings.push({setting: tagDimension.setting, reason: 'notImported'});
                    continue;
                }
                const tagName = findTagName(tagList.tags, value);
                if (!tagName) {
                    droppedSettings.push({setting: tagDimension.setting, reason: 'notFound'});
                    continue;
                }
                tagLevels[tagList.orderWeight] = tagName;
                continue;
            }

            switch (action.actionType) {
                case QBO_ACTION.CATEGORY: {
                    category = categoryLookup.get(value.toLowerCase()) ?? '';
                    if (value && !category) {
                        droppedSettings.push({setting: 'category', reason: 'notFound'});
                    }
                    break;
                }
                case QBO_ACTION.PAYEE: {
                    if (!value) {
                        break;
                    }
                    if (!isVendorFeatureAvailable || !isVendorListReady) {
                        droppedSettings.push({setting: 'vendor', reason: 'unavailable'});
                        break;
                    }
                    vendorID = vendorLookup.get(value.toLowerCase()) ?? '';
                    if (!vendorID) {
                        droppedSettings.push({setting: 'vendor', reason: 'notFound'});
                    }
                    break;
                }
                case QBO_ACTION.MEMO_REPLACE:
                    if (value) {
                        commentParts.unshift(value);
                    }
                    break;
                case QBO_ACTION.MEMO_APPEND:
                    if (value) {
                        commentParts.push(value);
                    }
                    break;
                case QBO_ACTION.SPLIT:
                    actionSkipReason ??= 'split';
                    break;
                case QBO_ACTION.EXCLUDE:
                    actionSkipReason ??= 'exclude';
                    break;
                case QBO_ACTION.TRANSACTION_TYPE:
                case QBO_ACTION.AUTO_ADD:
                    break;
                case QBO_ACTION.PRODUCT_SERVICE:
                    droppedSettings.push({setting: 'productService', reason: 'unsupported'});
                    break;
                default:
                    droppedSettings.push({setting: 'unknownSetting', reason: 'unsupported'});
            }
        }
        if (actionSkipReason) {
            skip(actionSkipReason);
            continue;
        }

        const comment = commentParts.join(' ');
        const tag = trimTag(Array.from(tagLevels, (level) => level ?? '').join(':'));
        if (!category && !vendorID && !comment && !tag) {
            skip('nothingToSet');
            continue;
        }

        for (const merchantFilter of merchantFilters) {
            const formValues: Partial<ExpenseDefaultFormValues> = {
                merchantToMatch: merchantFilter.value,
                matchType: merchantFilter.operator as ExpenseDefaultFormValues['matchType'],
                ...(category && {category}),
                ...(tag && {tag}),
                ...(comment && {comment}),
                ...(vendorID && {vendorID}),
            };
            const ruleKey = getRuleContentKey(formValues);
            if (seenRuleKeys.has(ruleKey)) {
                duplicateCount++;
                continue;
            }
            seenRuleKeys.add(ruleKey);
            orderedRules.push({
                filters: {left: CONST.RULES.EXPENSE_DEFAULT.FIELD.MERCHANT, operator: merchantFilter.operator, right: merchantFilter.value},
                ...(category && {category}),
                ...(tag && {tag}),
                ...(comment && {comment: Parser.replace(comment)}),
                ...(vendorID && {vendorID}),
                created: new Date().toISOString(),
            });
        }

        if (droppedSettings.length > 0) {
            rulesWithDroppedSettingsCount++;
            for (const {setting, reason} of droppedSettings) {
                const key = `${setting}|${reason}`;
                const existing = droppedSettingCounts.get(key);
                droppedSettingCounts.set(key, {setting, reason, count: (existing?.count ?? 0) + 1});
            }
        }
    }

    // The last row gets the lowest ID and goes into the request first, so the top row of the file is applied last and wins
    const ruleIDs = generateAscendingRuleIDs(orderedRules.length, random);
    const rules: Record<string, ImportedMerchantRule> = {};
    orderedRules.reverse().forEach((rule, index) => {
        const ruleID = ruleIDs.at(index);
        if (!ruleID) {
            return;
        }
        rules[ruleID] = rule;
    });

    return {rules, skippedRules, droppedSettings: [...droppedSettingCounts.values()], rulesWithDroppedSettingsCount, duplicateCount};
}

export {convertQuickBooksOnlineRules, generateAscendingRuleIDs, getQuickBooksOnlineRuleRows};
export type {ConvertedQuickBooksOnlineRules, QuickBooksOnlineDroppedSetting, QuickBooksOnlineDroppedSettingReason, QuickBooksOnlineRuleRow, QuickBooksOnlineRuleSkipReason};

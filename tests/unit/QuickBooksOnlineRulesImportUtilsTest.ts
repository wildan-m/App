import {convertQuickBooksOnlineRules, generateAscendingRuleIDs, getQuickBooksOnlineRuleRows} from '@libs/QuickBooksOnlineRulesImportUtils';
import {toIndexMap} from '@libs/RuleUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ImportedSpreadsheet, Policy, PolicyCategories, PolicyTagLists, Rule} from '@src/types/onyx';
import type {Connections} from '@src/types/onyx/Policy';

import type {OnyxCollection} from 'react-native-onyx';

import createRandomPolicy from '../utils/collections/policies';
import createMock from '../utils/createMock';

// The rows of the QBO_Rules_Test_Import.xls file attached to the issue, in file order
const QBO_TEST_FILE_ROWS: string[][] = [
    ['Rule Name', 'Rule Conditions', 'Rule Outputs'],
    [
        '01 IMPORT overlap winner - contains UBER EATS',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"UBER EATS"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Meals"}]}',
    ],
    [
        '02 IMPORT contains - sub-account category, payee, replace memo',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"STARBUCKS"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Meals:Coffee"},{"actionType":5,"value":"TEST Vendor"},{"actionType":1,"value":"Coffee run"}]}',
    ],
    [
        '03 IMPORT is exactly - category and class',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":13,"value":"AMAZON MKTPL"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"},{"actionType":2,"value":"TEST Class"}]}',
    ],
    [
        "04 SKIP doesn't contain",
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":8,"value":"REFUND"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"}]}',
    ],
    [
        '05 SKIP amount greater than',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":3,"value":"-500.00"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"}]}',
    ],
    [
        '06 SKIP All - contains plus amount less than',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"UBER"},{"ruleType":4,"value":"-100.00"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Travel"},{"actionType":3,"value":"TEST Location"}]}',
    ],
    [
        '07 SKIP split',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"OFFICE DEPOT"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":6,"value":{"actionInfoList":[{"categoryId":"Equipment","splitValue":"60","splitType":"percentage"},{"categoryId":"Coffee","splitValue":"40","splitType":"percentage"}]}}]}',
    ],
    [
        '08 IMPORT is exactly - auto-add ignored',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":13,"value":"LYFT"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Travel"},{"actionType":8,"value":true}]}',
    ],
    [
        '09 IMPORT contains - transaction type ignored',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"DELTA"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Travel"},{"actionType":7,"value":"3"}]}',
    ],
    ['10 SKIP amount equals', '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":2,"value":"-25.00"}],"isAndRule":true}', '{"ruleActions":[{"actionType":0,"value":"Equipment"}]}'],
    [
        '11 IMPORT Any - two merchants become two rules',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"HILTON"},{"ruleType":6,"value":"MARRIOTT"}],"isAndRule":false}',
        '{"ruleActions":[{"actionType":0,"value":"Travel"}]}',
    ],
    [
        '12 IMPORT Any - merchant kept, amount condition dropped',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"WEWORK"},{"ruleType":2,"value":"-25.00"}],"isAndRule":false}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"}]}',
    ],
    [
        '13 IMPORT account-scoped in QBO - scope not in file',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"ZOOM"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"},{"actionType":2,"value":"TEST Class"}]}',
    ],
    [
        '14 SKIP money in',
        '{"ruleConditions":[{"ruleType":10,"value":"1"},{"ruleType":6,"value":"STRIPE"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Sales of Product Income"}]}',
    ],
    [
        '15 IMPORT customer and append memo - product dropped',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"GUSTO"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":16,"value":"5"},{"actionType":14,"value":"TEST Customer"},{"actionType":9,"value":"Payroll fees"}]}',
    ],
    [
        '16 SKIP product only - nothing left to set',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"STAPLES"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":16,"value":"5"}]}',
    ],
    ['17 SKIP exclude', '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"VENMO"}],"isAndRule":true}', '{"ruleActions":[{"actionType":12,"value":true}]}'],
    [
        '18 IMPORT location tag',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"SHELL"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Travel"},{"actionType":3,"value":"TEST Location"}]}',
    ],
    [
        '19 IMPORT sub-class - colon escaped in tag',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"ADOBE"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"},{"actionType":2,"value":"TEST Class:TEST Subclass"}]}',
    ],
    [
        '20 IMPORT unknown action code - code dropped',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"SLACK"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Equipment"},{"actionType":4,"value":"UNKNOWN"}]}',
    ],
    [
        '21 IMPORT overlap loser - contains UBER',
        '{"ruleConditions":[{"ruleType":10,"value":"-1"},{"ruleType":6,"value":"UBER"}],"isAndRule":true}',
        '{"ruleActions":[{"actionType":0,"value":"Travel"}]}',
    ],
];

/** Turns rows into the column-major shape ImportSpreadsheet stores */
function buildSpreadsheet(rows: string[][]): ImportedSpreadsheet {
    const columnCount = rows.at(0)?.length ?? 0;
    return createMock<ImportedSpreadsheet>({
        data: Array.from({length: columnCount}, (_, columnIndex) => rows.map((row) => row.at(columnIndex) ?? '')),
        columns: {},
        containsHeader: true,
    });
}

type DimensionSetting = (typeof CONST.INTEGRATION_ENTITY_MAP_TYPES)[keyof typeof CONST.INTEGRATION_ENTITY_MAP_TYPES];

function buildPolicy(syncClasses: DimensionSetting = CONST.INTEGRATION_ENTITY_MAP_TYPES.TAG): Policy {
    return createMock<Policy>({
        ...createRandomPolicy(0),
        id: 'policy1',
        connections: createMock<Connections>({
            [CONST.POLICY.CONNECTIONS.NAME.QBO]: {
                config: {
                    nonReimbursableExpensesExportDestination: CONST.QUICKBOOKS_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.CREDIT_CARD,
                    syncClasses,
                    syncCustomers: CONST.INTEGRATION_ENTITY_MAP_TYPES.TAG,
                    syncLocations: CONST.INTEGRATION_ENTITY_MAP_TYPES.TAG,
                },
                data: {vendors: [{id: 'vendor-1', name: 'TEST Vendor', currency: 'USD'}]},
            },
        }),
    });
}

function buildCategories(): PolicyCategories {
    const names = ['Equipment', 'Travel', 'Meals', 'Meals:Coffee'];
    return createMock<PolicyCategories>(Object.fromEntries(names.map((name) => [name, {name, enabled: true}])));
}

function buildTagList(name: string, orderWeight: number, tagNames: string[]) {
    return {
        name,
        orderWeight,
        required: false,
        tags: Object.fromEntries(tagNames.map((tagName) => [tagName, {name: tagName, enabled: true}])),
    };
}

function buildTagLists(): PolicyTagLists {
    return createMock<PolicyTagLists>({
        Classes: buildTagList('Classes', 0, ['TEST Class', 'TEST Class\\:TEST Subclass']),
        'Customers/Projects': buildTagList('Customers/Projects', 1, ['TEST Customer']),
        Locations: buildTagList('Locations', 2, ['TEST Location']),
    });
}

function convert({policy = buildPolicy(), existingRules = {}, rows = QBO_TEST_FILE_ROWS}: {policy?: Policy; existingRules?: OnyxCollection<Rule>; rows?: string[][]} = {}) {
    return convertQuickBooksOnlineRules({
        rows: getQuickBooksOnlineRuleRows(buildSpreadsheet(rows)) ?? [],
        policy,
        policyCategories: buildCategories(),
        policyTagLists: buildTagLists(),
        existingRules,
        isVendorFeatureAvailable: true,
        isVendorListReady: true,
    });
}

/** Imported rules in the order the request sends them, which is the reverse of the file order */
function getRequestRules(result: ReturnType<typeof convert>) {
    return Object.entries(result.rules).map(([ruleID, rule]) => ({ruleID, ...rule}));
}

describe('QuickBooksOnlineRulesImportUtils', () => {
    describe('getQuickBooksOnlineRuleRows', () => {
        it('returns undefined for a sheet that is not a QuickBooks Online rules export', () => {
            // Given a spreadsheet without the Rule Conditions and Rule Outputs headers
            const spreadsheet = buildSpreadsheet([
                ['Merchant', 'Category'],
                ['UBER', 'Travel'],
            ]);

            // When reading its rows
            const rows = getQuickBooksOnlineRuleRows(spreadsheet);

            // Then it is not treated as a QuickBooks Online file, so the page can show an error instead of importing nothing
            expect(rows).toBeUndefined();
        });
    });

    describe('convertQuickBooksOnlineRules', () => {
        it('imports 14 rules, skips 8 and reports 3 rules with a setting not set for the issue test file', () => {
            // Given the issue's test file and a workspace with Classes, Customers and Locations imported as tags
            // When converting it
            const result = convert();

            // Then the totals match the issue's expected results
            expect(Object.keys(result.rules)).toHaveLength(14);
            expect(result.skippedRules.map(({name, reason}) => [name.slice(0, 2), reason])).toEqual([
                ['04', 'doesNotContain'],
                ['05', 'amountCondition'],
                ['06', 'amountCondition'],
                ['07', 'split'],
                ['10', 'amountCondition'],
                ['14', 'moneyIn'],
                ['16', 'nothingToSet'],
                ['17', 'exclude'],
            ]);
            expect(result.rulesWithDroppedSettingsCount).toBe(3);
            expect(result.droppedSettings).toEqual([
                {setting: 'amountCondition', reason: 'unsupported', count: 1},
                {setting: 'productService', reason: 'unsupported', count: 1},
                {setting: 'unknownSetting', reason: 'unsupported', count: 1},
            ]);
            expect(result.duplicateCount).toBe(0);
        });

        it('maps each QuickBooks Online rule to the merchant rule the issue expects', () => {
            // Given the issue's test file
            // When converting it
            const rules = getRequestRules(convert()).reverse();

            // Then every imported rule matches the merchant and sets only what the QuickBooks Online rule set, in file order
            expect(rules.map(({filters, category, tag, comment, vendorID}) => ({filters, category, tag, comment, vendorID}))).toEqual([
                {filters: {left: 'merchant', operator: 'contains', right: 'UBER EATS'}, category: 'Meals'},
                {filters: {left: 'merchant', operator: 'contains', right: 'STARBUCKS'}, category: 'Meals:Coffee', vendorID: 'vendor-1', comment: 'Coffee run'},
                {filters: {left: 'merchant', operator: 'eq', right: 'AMAZON MKTPL'}, category: 'Equipment', tag: 'TEST Class'},
                {filters: {left: 'merchant', operator: 'eq', right: 'LYFT'}, category: 'Travel'},
                {filters: {left: 'merchant', operator: 'contains', right: 'DELTA'}, category: 'Travel'},
                {filters: {left: 'merchant', operator: 'contains', right: 'HILTON'}, category: 'Travel'},
                {filters: {left: 'merchant', operator: 'contains', right: 'MARRIOTT'}, category: 'Travel'},
                {filters: {left: 'merchant', operator: 'contains', right: 'WEWORK'}, category: 'Equipment'},
                {filters: {left: 'merchant', operator: 'contains', right: 'ZOOM'}, category: 'Equipment', tag: 'TEST Class'},
                {filters: {left: 'merchant', operator: 'contains', right: 'GUSTO'}, tag: ':TEST Customer', comment: 'Payroll fees'},
                {filters: {left: 'merchant', operator: 'contains', right: 'SHELL'}, category: 'Travel', tag: '::TEST Location'},
                {filters: {left: 'merchant', operator: 'contains', right: 'ADOBE'}, category: 'Equipment', tag: 'TEST Class\\:TEST Subclass'},
                {filters: {left: 'merchant', operator: 'contains', right: 'SLACK'}, category: 'Equipment'},
                {filters: {left: 'merchant', operator: 'contains', right: 'UBER'}, category: 'Travel'},
            ]);
        });

        it('gives the top row the highest rule ID so it is applied last and wins', () => {
            // Given the issue's test file, where row 01 (UBER EATS -> Meals) and row 21 (UBER -> Travel) both match "UBER EATS 1234"
            // When converting it
            const rules = getRequestRules(convert());

            // Then the IDs have the same length, ascend in request order, and row 01 holds the highest one
            const ruleIDs = rules.map(({ruleID}) => BigInt(ruleID));
            expect(new Set(rules.map(({ruleID}) => ruleID.length)).size).toBe(1);
            expect(ruleIDs.every((ruleID, index) => index === 0 || ruleID > (ruleIDs.at(index - 1) ?? 0n))).toBe(true);
            expect(rules.at(-1)?.filters?.right).toBe('UBER EATS');
            expect(rules.at(0)?.filters?.right).toBe('UBER');
        });

        it('reports the class instead of setting it when Classes are imported as report fields', () => {
            // Given a workspace that imports Classes as report fields
            const policy = buildPolicy(CONST.INTEGRATION_ENTITY_MAP_TYPES.REPORT_FIELD);

            // When converting the issue's test file
            const result = convert({policy});

            // Then rows 03, 13 and 19 are imported without a class and the modal can say why
            const rules = getRequestRules(result);
            expect(rules.find(({filters}) => filters?.right === 'AMAZON MKTPL')?.tag).toBeUndefined();
            expect(rules.find(({filters}) => filters?.right === 'ZOOM')?.tag).toBeUndefined();
            expect(rules.find(({filters}) => filters?.right === 'ADOBE')?.tag).toBeUndefined();
            expect(result.droppedSettings).toContainEqual({setting: 'class', reason: 'reportField', count: 3});
            expect(result.rulesWithDroppedSettingsCount).toBe(6);
        });

        it('adds no rule when the same file is imported again', () => {
            // Given a workspace that already has the rules from a first import
            const firstImport = convert();
            const {FIELD} = CONST.RULES.EXPENSE_DEFAULT;
            const existingRules: OnyxCollection<Rule> = Object.fromEntries(
                Object.entries(firstImport.rules).map(([ruleID, rule]) => {
                    const fieldValues: Array<[string, string | undefined]> = [
                        [FIELD.CATEGORY, rule.category],
                        [FIELD.TAG, rule.tag],
                        [FIELD.COMMENT, rule.comment],
                        [FIELD.VENDOR_ID, rule.vendorID],
                    ];
                    const actions = fieldValues.filter(([, value]) => !!value).map(([field, value]) => ({name: CONST.RULES.ACTIONS.SET, field, value}));
                    const existingRule = createMock<Rule>({
                        scope: CONST.RULES.SCOPE.POLICY,
                        scopeID: 'policy1',
                        triggers: toIndexMap([CONST.RULES.TRIGGERS.CREATE_TRANSACTION]),
                        filters: rule.filters,
                        actions: toIndexMap(actions),
                    });
                    return [`${ONYXKEYS.COLLECTION.RULE}${ruleID}`, existingRule];
                }),
            );

            // When importing the file again
            const result = convert({existingRules});

            // Then every converted rule is reported as a duplicate
            expect(Object.keys(result.rules)).toHaveLength(0);
            expect(result.duplicateCount).toBe(14);
        });

        it('skips an "All" rule with two text conditions, since one merchant filter would match more expenses', () => {
            // Given an "All" rule requiring two descriptions
            const rows = [
                ['Rule Name', 'Rule Conditions', 'Rule Outputs'],
                ['Both', '{"ruleConditions":[{"ruleType":6,"value":"UBER"},{"ruleType":6,"value":"EATS"}],"isAndRule":true}', '{"ruleActions":[{"actionType":0,"value":"Meals"}]}'],
                ['Broken', 'not json', '{}'],
            ];

            // When converting it
            const result = convert({rows});

            // Then it is skipped, and an unreadable row is reported rather than failing the whole file
            expect(Object.keys(result.rules)).toHaveLength(0);
            expect(result.skippedRules).toEqual([
                {name: 'Both', reason: 'multipleMerchantConditions'},
                {name: 'Broken', reason: 'unreadable'},
            ]);
        });
    });

    describe('generateAscendingRuleIDs', () => {
        it('returns same-length ascending IDs below 2^63 even for the highest random draw', () => {
            // Given the highest value the random source can return
            // When generating IDs
            const ruleIDs = generateAscendingRuleIDs(3, () => 0.9999999999999999);

            // Then they keep the same length and stay within a signed 64-bit integer
            expect(ruleIDs.map((ruleID) => ruleID.length)).toEqual([18, 18, 18]);
            expect(BigInt(ruleIDs.at(2) ?? '0')).toBeLessThan(2n ** 63n);
            expect(BigInt(ruleIDs.at(2) ?? '0') - BigInt(ruleIDs.at(0) ?? '0')).toBe(2n);
        });
    });
});

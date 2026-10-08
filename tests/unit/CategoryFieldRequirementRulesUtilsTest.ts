import {applyFieldRequirementRulesToCategories, getCategoryFieldRequirementsFromRules, isFieldRequirementRule} from '@libs/CategoryFieldRequirementRulesUtils';
import ViolationsUtils from '@libs/Violations/ViolationsUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, PolicyCategories, Transaction} from '@src/types/onyx';
import type Rule from '@src/types/onyx/Rule';

import type {OnyxCollection} from 'react-native-onyx';

const POLICY_ID = 'ABC123';
const OTHER_POLICY_ID = 'XYZ789';

/** Builds a field requirement rule shaped like the ones `GetRules` returns. */
function buildFieldRequirementRule(categoryName: string, fields: string[], overrides: Partial<Record<string, unknown>> = {}): Rule {
    return {
        scope: CONST.RULES.SCOPE.POLICY,
        scopeID: POLICY_ID,
        triggers: {1: CONST.RULES.TRIGGERS.CREATE_TRANSACTION, 2: CONST.RULES.TRIGGERS.UPDATE_TRANSACTION},
        filters: {left: 'category', operator: 'eq', right: categoryName},
        actions: Object.fromEntries(fields.map((field, index) => [String(index + 1), {name: CONST.RULES.ACTIONS.REQUIRE_FIELD, field}])),
        ...overrides,
    } as unknown as Rule;
}

function toCollection(rules: Rule[]): OnyxCollection<Rule> {
    return Object.fromEntries(rules.map((rule, index) => [`${ONYXKEYS.COLLECTION.RULE}${index + 1}`, rule]));
}

const policyCategories: PolicyCategories = {
    Car: {name: 'Car', enabled: true},
    Meals: {name: 'Meals', enabled: true},
};

describe('CategoryFieldRequirementRulesUtils', () => {
    it('recognises a field requirement rule but not an expense default rule', () => {
        // Given a field requirement rule and a merchant expense default rule from the same collection
        const fieldRequirementRule = buildFieldRequirementRule('Car', ['description']);
        const expenseDefaultRule = {
            scope: CONST.RULES.SCOPE.POLICY,
            scopeID: POLICY_ID,
            triggers: {1: CONST.RULES.TRIGGERS.CREATE_TRANSACTION},
            filters: {left: 'merchant', operator: 'eq', right: 'Uber'},
            actions: {1: {name: CONST.RULES.ACTIONS.SET, field: 'category', value: 'Car'}},
        } as unknown as Rule;

        // When each is checked
        // Then only the one requiring a field on a category counts, so other rule kinds never leak into the requirements
        expect(isFieldRequirementRule(fieldRequirementRule)).toBe(true);
        expect(isFieldRequirementRule(expenseDefaultRule)).toBe(false);
    });

    it('reads every required field of a category from its rules', () => {
        // Given the rule from the issue, requiring all four fields on "Car"
        const rules = toCollection([buildFieldRequirementRule('Car', ['description', 'receipt', 'itemizedReceipt', 'attendees'])]);

        // When the requirements are collected
        const requirements = getCategoryFieldRequirementsFromRules(rules, POLICY_ID);

        // Then "Car" requires all four, with the receipts required at any amount, and "Meals" requires nothing
        expect(requirements.Car).toEqual({isDescriptionRequired: true, isAttendeesRequired: true, receiptRequiredOver: 0, itemizedReceiptRequiredOver: 0});
        expect(requirements.Meals).toBeUndefined();
    });

    it('reads a receipt threshold from an amount filter', () => {
        // Given a rule requiring a receipt on "Car" only above 2500
        const rule = buildFieldRequirementRule('Car', ['receipt'], {
            filters: {operator: 'and', left: {left: 'category', operator: 'eq', right: 'Car'}, right: {left: 'amount', operator: 'gt', right: 2500}},
        });

        // When the requirements are collected
        const requirements = getCategoryFieldRequirementsFromRules(toCollection([rule]), POLICY_ID);

        // Then the threshold carries over, matching how `maxAmountNoReceipt` expresses it on the category
        expect(requirements.Car?.receiptRequiredOver).toBe(2500);
    });

    it('ignores rules of other policies and rules pending deletion', () => {
        // Given a rule for another policy and a rule being deleted offline
        const rules = toCollection([
            buildFieldRequirementRule('Car', ['description'], {scopeID: OTHER_POLICY_ID}),
            buildFieldRequirementRule('Meals', ['attendees'], {pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE}),
        ]);

        // When the requirements are collected for this policy
        const requirements = getCategoryFieldRequirementsFromRules(rules, POLICY_ID);

        // Then neither applies, since `GetRules` returns every rule the user can see
        expect(requirements).toEqual({});
    });

    it('replaces the category flags with the rules', () => {
        // Given a category flag that no longer has a rule, and a rule the category flags do not reflect
        const categories: PolicyCategories = {
            Car: {name: 'Car', enabled: true, areCommentsRequired: true},
            Meals: {name: 'Meals', enabled: true},
        };
        const rules = toCollection([buildFieldRequirementRule('Meals', ['description', 'attendees'])]);

        // When the categories are resolved against the rules
        const resolved = applyFieldRequirementRulesToCategories(categories, rules, POLICY_ID);

        // Then the rules win, so the UI stops reading the requirements off `policyCategories_`
        expect(resolved?.Car?.areCommentsRequired).toBe(false);
        expect(resolved?.Meals?.areCommentsRequired).toBe(true);
        expect(resolved?.Meals?.areAttendeesRequired).toBe(true);
    });

    it('keeps the category value of a field with a pending write', () => {
        // Given the description requirement was just turned on through the category command, before the rule exists
        const categories: PolicyCategories = {
            Car: {name: 'Car', enabled: true, areCommentsRequired: true, pendingFields: {areCommentsRequired: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE}},
        };

        // When the categories are resolved against a collection that has no rule for it yet
        const resolved = applyFieldRequirementRulesToCategories(categories, toCollection([]), POLICY_ID);

        // Then the optimistic value shows, since writes still go through the category commands rather than `SetRule`
        expect(resolved?.Car?.areCommentsRequired).toBe(true);
    });

    it('falls back to the category flags until the rules collection has loaded', () => {
        // Given the rules collection has not been fetched yet
        const categories: PolicyCategories = {Car: {name: 'Car', enabled: true, areCommentsRequired: true}};

        // When the categories are resolved
        const resolved = applyFieldRequirementRulesToCategories(categories, undefined, POLICY_ID);

        // Then nothing is dropped while there is nothing to read the requirements from
        expect(resolved).toBe(categories);
    });

    it('raises the missing comment violation from a rule', () => {
        // Given a Control policy whose "Car" category has no flags, but a rule requiring a description
        const policy = {id: POLICY_ID, type: CONST.POLICY.TYPE.CORPORATE, requiresCategory: false, areRulesEnabled: true, outputCurrency: 'USD'} as Policy;
        const transaction = {transactionID: '1', amount: -1000, currency: 'USD', category: 'Car', comment: {}} as Transaction;
        const rules = toCollection([buildFieldRequirementRule('Car', ['description'])]);

        // When violations are computed with the rules collection
        const result = ViolationsUtils.getViolationsOnyxData({
            updatedTransaction: transaction,
            transactionViolations: [],
            policy,
            policyTagList: {},
            policyCategories,
            hasDependentTags: false,
            isInvoiceTransaction: false,
            ownerLogin: undefined,
            isVendorMatchingBetaEnabled: false,
            rules,
        });

        // Then the missing comment violation comes from the rule rather than the category flag
        expect(result.value).toEqual(expect.arrayContaining([expect.objectContaining({name: CONST.VIOLATIONS.MISSING_COMMENT})]));
    });
});

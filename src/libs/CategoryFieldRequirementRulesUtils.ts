/**
 * Helpers for reading category field requirements (require description, receipt, itemized receipt, attendees) from the
 * `rules_` collection that `GetRules` populates, instead of from the flags stored on each `policyCategories_` entry.
 *
 * Writes still go through the `SetPolicyCategory*` commands, which update the category optimistically, so a field
 * with a pending write keeps the category's value until the rules collection catches up.
 */
import CONST from '@src/CONST';
import type {PolicyCategories, PolicyCategory} from '@src/types/onyx';
import type Rule from '@src/types/onyx/Rule';
import type {RuleFilterComparison} from '@src/types/onyx/RuleFilters';

import type {OnyxCollection} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import {fromIndexMap, getRuleFilterLeaves} from './RuleUtils';

type FieldRequirementField = ValueOf<typeof CONST.RULES.FIELD_REQUIREMENT.FIELD>;

/** A `RequireField` action, as stored on a field requirement rule. */
type RequireFieldAction = {
    /** What the rule does when it matches. */
    name: typeof CONST.RULES.ACTIONS.REQUIRE_FIELD;

    /** The expense field the action requires. */
    field: FieldRequirementField;
};

/** The field requirements a category's rules impose. Receipt thresholds are in the same units as `maxAmountNoReceipt`. */
type CategoryFieldRequirements = {
    isDescriptionRequired: boolean;
    isAttendeesRequired: boolean;

    /** Amount above which a receipt is required, `0` when it is always required, `undefined` when no rule requires it. */
    receiptRequiredOver?: number;

    /** Amount above which an itemized receipt is required, `0` when it is always required, `undefined` when no rule requires it. */
    itemizedReceiptRequiredOver?: number;
};

type RequirementPendingFieldKey = 'areCommentsRequired' | 'areAttendeesRequired' | 'maxAmountNoReceipt' | 'maxAmountNoItemizedReceipt';

const FIELD_REQUIREMENT_FIELDS: readonly string[] = Object.values(CONST.RULES.FIELD_REQUIREMENT.FIELD);

function isRequireFieldAction(action: unknown): action is RequireFieldAction {
    if (!action || typeof action !== 'object' || !('name' in action) || !('field' in action)) {
        return false;
    }
    return action.name === CONST.RULES.ACTIONS.REQUIRE_FIELD && typeof action.field === 'string' && FIELD_REQUIREMENT_FIELDS.includes(action.field);
}

function getRequireFieldActions(rule: Rule): RequireFieldAction[] {
    // Rules of other kinds carry actions of a different shape, so read them as unknown and narrow each one.
    const actions: Record<string, unknown> | undefined = rule.actions;
    return fromIndexMap(actions).filter(isRequireFieldAction);
}

function getCategoryComparison(leaves: RuleFilterComparison[]): RuleFilterComparison | undefined {
    return leaves.find((leaf) => leaf.left === CONST.RULES.FIELD_REQUIREMENT.FILTER.CATEGORY && leaf.operator === CONST.SEARCH.SYNTAX_OPERATORS.EQUAL_TO && typeof leaf.right === 'string');
}

/**
 * A field requirement rule fires on transaction events, is scoped to a category, and requires at least one field.
 * Like `isExpenseDefaultRule`, this is a heuristic over triggers, filters and action names.
 */
function isFieldRequirementRule(rule: Rule | undefined): rule is Rule {
    if (!rule) {
        return false;
    }

    const fieldRequirementTriggers: readonly string[] = CONST.RULES.FIELD_REQUIREMENT.TRIGGERS;
    const triggers: Record<string, string> | undefined = rule.triggers;
    const hasTransactionTrigger = fromIndexMap(triggers).some((trigger) => fieldRequirementTriggers.includes(trigger));

    return hasTransactionTrigger && !!getCategoryComparison(getRuleFilterLeaves(rule.filters)) && getRequireFieldActions(rule).length > 0;
}

/**
 * The amount above which a receipt is required, read off an `amount` comparison combined with the category filter.
 * Without one the receipt is required at any amount, which the category flags express as `0`.
 */
function getReceiptThreshold(leaves: RuleFilterComparison[]): number {
    const amountComparison = leaves.find((leaf) => leaf.left === CONST.RULES.FIELD_REQUIREMENT.FILTER.AMOUNT);
    const amount = Number(amountComparison?.right);
    if (!amountComparison || Number.isNaN(amount)) {
        return 0;
    }
    // `maxAmountNoReceipt` is exclusive (required when the amount is over it), so an inclusive bound sits one unit lower.
    return amountComparison.operator === CONST.SEARCH.SYNTAX_OPERATORS.GREATER_THAN_OR_EQUAL_TO ? amount - 1 : amount;
}

function getLowerThreshold(current: number | undefined, next: number): number {
    return current === undefined ? next : Math.min(current, next);
}

/** Collects the field requirements of every category of a policy from the rules collection, keyed by category name. */
function getCategoryFieldRequirementsFromRules(rulesCollection: OnyxCollection<Rule> | undefined, policyID: string | undefined): Record<string, CategoryFieldRequirements> {
    const requirementsByCategory: Record<string, CategoryFieldRequirements> = {};
    if (!policyID) {
        return requirementsByCategory;
    }

    for (const rule of Object.values(rulesCollection ?? {})) {
        if (
            !rule ||
            rule.scope !== CONST.RULES.SCOPE.POLICY ||
            rule.scopeID !== policyID ||
            rule.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE ||
            !isFieldRequirementRule(rule)
        ) {
            continue;
        }

        const leaves = getRuleFilterLeaves(rule.filters);
        const categoryName = getCategoryComparison(leaves)?.right;
        if (typeof categoryName !== 'string') {
            continue;
        }

        const requirements = requirementsByCategory[categoryName] ?? {isDescriptionRequired: false, isAttendeesRequired: false};
        for (const action of getRequireFieldActions(rule)) {
            switch (action.field) {
                case CONST.RULES.FIELD_REQUIREMENT.FIELD.DESCRIPTION:
                    requirements.isDescriptionRequired = true;
                    break;
                case CONST.RULES.FIELD_REQUIREMENT.FIELD.ATTENDEES:
                    requirements.isAttendeesRequired = true;
                    break;
                case CONST.RULES.FIELD_REQUIREMENT.FIELD.RECEIPT:
                    requirements.receiptRequiredOver = getLowerThreshold(requirements.receiptRequiredOver, getReceiptThreshold(leaves));
                    break;
                case CONST.RULES.FIELD_REQUIREMENT.FIELD.ITEMIZED_RECEIPT:
                    requirements.itemizedReceiptRequiredOver = getLowerThreshold(requirements.itemizedReceiptRequiredOver, getReceiptThreshold(leaves));
                    break;
                default:
                    break;
            }
        }
        requirementsByCategory[categoryName] = requirements;
    }

    return requirementsByCategory;
}

function hasPendingWrite(category: PolicyCategory, field: RequirementPendingFieldKey): boolean {
    return !!category.pendingFields?.[field];
}

/**
 * Category-level "do not require" overrides of the policy receipt threshold are not field requirements, so a category
 * keeps them when no rule requires the receipt.
 */
function getResolvedReceiptThreshold(categoryValue: number | null | undefined, ruleThreshold: number | undefined): number | null | undefined {
    if (ruleThreshold !== undefined) {
        return ruleThreshold;
    }
    return categoryValue === CONST.DISABLED_MAX_EXPENSE_VALUE ? categoryValue : null;
}

/** Returns the category with its field requirements taken from the rules, keeping any field that has a pending write. */
function applyFieldRequirementRulesToCategory(category: PolicyCategory, requirements: CategoryFieldRequirements | undefined): PolicyCategory {
    return {
        ...category,
        areCommentsRequired: hasPendingWrite(category, 'areCommentsRequired') ? category.areCommentsRequired : !!requirements?.isDescriptionRequired,
        areAttendeesRequired: hasPendingWrite(category, 'areAttendeesRequired') ? category.areAttendeesRequired : !!requirements?.isAttendeesRequired,
        maxAmountNoReceipt: hasPendingWrite(category, 'maxAmountNoReceipt')
            ? category.maxAmountNoReceipt
            : getResolvedReceiptThreshold(category.maxAmountNoReceipt, requirements?.receiptRequiredOver),
        maxAmountNoItemizedReceipt: hasPendingWrite(category, 'maxAmountNoItemizedReceipt')
            ? category.maxAmountNoItemizedReceipt
            : getResolvedReceiptThreshold(category.maxAmountNoItemizedReceipt, requirements?.itemizedReceiptRequiredOver),
    };
}

/**
 * Returns the policy's categories with their field requirements read from the rules collection.
 *
 * Only pass the result to code that reads requirements. Write actions snapshot the categories they are given for their
 * failure data, so they must keep receiving the stored categories.
 */
function applyFieldRequirementRulesToCategories(
    policyCategories: PolicyCategories | undefined,
    rulesCollection: OnyxCollection<Rule> | undefined,
    policyID: string | undefined,
): PolicyCategories | undefined {
    // Until `GetRules` has populated the collection there is nothing to read the requirements from, and treating that
    // as "nothing is required" would drop every requirement (and its violations) the category already carries.
    if (!policyCategories || !rulesCollection) {
        return policyCategories;
    }

    const requirementsByCategory = getCategoryFieldRequirementsFromRules(rulesCollection, policyID);
    const resolvedCategories: PolicyCategories = {};
    for (const [categoryName, category] of Object.entries(policyCategories)) {
        resolvedCategories[categoryName] = applyFieldRequirementRulesToCategory(category, requirementsByCategory[categoryName]);
    }
    return resolvedCategories;
}

export {applyFieldRequirementRulesToCategories, applyFieldRequirementRulesToCategory, getCategoryFieldRequirementsFromRules, isFieldRequirementRule};
export type {CategoryFieldRequirements};

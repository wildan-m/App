import type {LocaleContextProps} from '@components/LocaleContextProvider';
import type {TableData} from '@components/Table';
import type {CurrencyListActionsContextType} from '@hooks/useCurrencyList';
import type PolicyData from '@hooks/usePolicyData/types';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import type {RequireFieldsRuleDirection, RequireFieldsRuleForm, RequireFieldsRuleToggleFieldKey} from '@src/types/form/RequireFieldsRuleForm';
import INPUT_IDS from '@src/types/form/RequireFieldsRuleForm';
import type {Policy, PolicyCategories, PolicyCategory} from '@src/types/onyx';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';
import type DeepValueOf from '@src/types/utils/DeepValueOf';
import {
    removePolicyCategoryItemizedReceiptsRequired,
    removePolicyCategoryReceiptsRequired,
    setPolicyCategoryAttendeesRequired,
    setPolicyCategoryDescriptionRequired,
    setPolicyCategoryItemizedReceiptsRequired,
    setPolicyCategoryReceiptsRequired,
} from './actions/Policy/Category';
import {getDecodedCategoryName} from './CategoryUtils';
import {isPendingDeleteOrUpdate} from './PolicyRulesUtils';

type RequireFieldsRuleType = DeepValueOf<typeof CONST.REQUIRE_FIELDS_RULE_TYPES>;

type RequireFieldsTableItem = TableData & {
    ruleID: string;
    categoryName: string;
    typeLabel: string;
    conditionText: string;
    ruleDescription: string;
    searchTokens: string[];
    pendingAction?: PendingAction;
    action: () => void;
};

function getRequireFieldsRuleNavigationRoute(policyID: string, categoryName: string): Route {
    return ROUTES.RULES_REQUIRE_FIELDS_RULE_EDIT.getRoute(policyID, categoryName);
}

function hasExplicitReceiptThreshold(value: number | null | undefined): value is number {
    return value !== null && value !== undefined && value !== CONST.DISABLED_MAX_EXPENSE_VALUE;
}

function hasCategoryReceiptOverride(value: number | null | undefined): boolean {
    return value !== null && value !== undefined;
}

function isReceiptWaived(value: number | null | undefined): boolean {
    return value === CONST.DISABLED_MAX_EXPENSE_VALUE;
}

/**
 * Derives the direction (`require` / `doNotRequire`) of a category's field-requirements rule from its stored data.
 * The waive path is only supported for receipt / itemized receipt, so a row is `doNotRequire` when either receipt
 * threshold is set to the "never require" sentinel; otherwise it is `require`.
 */
function getRequireFieldsRuleDirection(category: PolicyCategory | undefined): RequireFieldsRuleDirection {
    if (category && (isReceiptWaived(category.maxAmountNoReceipt) || isReceiptWaived(category.maxAmountNoItemizedReceipt))) {
        return CONST.REQUIRE_FIELDS_RULE_DIRECTION.DO_NOT_REQUIRE;
    }
    return CONST.REQUIRE_FIELDS_RULE_DIRECTION.REQUIRE;
}

function categoryHasLegacyReceiptRules(category: PolicyCategory | undefined): boolean {
    if (!category) {
        return false;
    }

    return hasCategoryReceiptOverride(category.maxAmountNoReceipt) || hasCategoryReceiptOverride(category.maxAmountNoItemizedReceipt);
}

function categoryHasAnyRequireFieldsRule(category: PolicyCategory): boolean {
    return (
        !!category.areCommentsRequired ||
        !!category.areAttendeesRequired ||
        hasCategoryReceiptOverride(category.maxAmountNoReceipt) ||
        hasCategoryReceiptOverride(category.maxAmountNoItemizedReceipt)
    );
}

function isRequireFieldEnabled(category: PolicyCategory | undefined, field: RequireFieldsRuleToggleFieldKey, direction: RequireFieldsRuleDirection): boolean {
    if (!category) {
        return false;
    }

    const isWaiveDirection = direction === CONST.REQUIRE_FIELDS_RULE_DIRECTION.DO_NOT_REQUIRE;

    switch (field) {
        case INPUT_IDS.REQUIRE_DESCRIPTION:
            return !!category.areCommentsRequired;
        case INPUT_IDS.REQUIRE_ATTENDEES:
            return !!category.areAttendeesRequired;
        case INPUT_IDS.REQUIRE_RECEIPT:
            return isWaiveDirection ? isReceiptWaived(category.maxAmountNoReceipt) : hasExplicitReceiptThreshold(category.maxAmountNoReceipt);
        case INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT:
            return isWaiveDirection ? isReceiptWaived(category.maxAmountNoItemizedReceipt) : hasExplicitReceiptThreshold(category.maxAmountNoItemizedReceipt);
        default:
            return false;
    }
}

function getRequireFieldsFormFromCategory(category: PolicyCategory | undefined): Partial<RequireFieldsRuleForm> {
    const direction = getRequireFieldsRuleDirection(category);

    return {
        [INPUT_IDS.DIRECTION]: direction,
        [INPUT_IDS.REQUIRE_DESCRIPTION]: isRequireFieldEnabled(category, INPUT_IDS.REQUIRE_DESCRIPTION, direction),
        [INPUT_IDS.REQUIRE_ATTENDEES]: isRequireFieldEnabled(category, INPUT_IDS.REQUIRE_ATTENDEES, direction),
        [INPUT_IDS.REQUIRE_RECEIPT]: isRequireFieldEnabled(category, INPUT_IDS.REQUIRE_RECEIPT, direction),
        [INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT]: isRequireFieldEnabled(category, INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT, direction),
    };
}

function getEffectiveRequireFieldsRuleForm(category: PolicyCategory | undefined, form: Partial<RequireFieldsRuleForm>): RequireFieldsRuleForm {
    const categoryForm = getRequireFieldsFormFromCategory(category);
    const direction = form[INPUT_IDS.DIRECTION] ?? categoryForm[INPUT_IDS.DIRECTION] ?? CONST.REQUIRE_FIELDS_RULE_DIRECTION.REQUIRE;

    return {
        [INPUT_IDS.CATEGORY]: form[INPUT_IDS.CATEGORY] ?? '',
        [INPUT_IDS.DIRECTION]: direction,
        [INPUT_IDS.REQUIRE_DESCRIPTION]: form[INPUT_IDS.REQUIRE_DESCRIPTION] ?? categoryForm[INPUT_IDS.REQUIRE_DESCRIPTION] ?? false,
        [INPUT_IDS.REQUIRE_ATTENDEES]: form[INPUT_IDS.REQUIRE_ATTENDEES] ?? categoryForm[INPUT_IDS.REQUIRE_ATTENDEES] ?? false,
        [INPUT_IDS.REQUIRE_RECEIPT]: form[INPUT_IDS.REQUIRE_RECEIPT] ?? categoryForm[INPUT_IDS.REQUIRE_RECEIPT] ?? false,
        [INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT]: form[INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT] ?? categoryForm[INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT] ?? false,
    };
}

/**
 * Applies a receipt / itemized-receipt field change. In the `require` direction a checked field means "always require"
 * (threshold `0`); in the `doNotRequire` direction it means "waive / never require" (threshold `DISABLED_MAX_EXPENSE_VALUE`).
 * An unchecked field clears the override. No write is issued when the checked state already matches the stored value,
 * so an existing "require receipt over X" amount is preserved on an unrelated save.
 */
function applyReceiptFieldChange(policyData: PolicyData, categoryName: string, currentValue: number | null | undefined, isChecked: boolean, isWaive: boolean, isItemized: boolean) {
    const currentlyChecked = isWaive ? isReceiptWaived(currentValue) : hasExplicitReceiptThreshold(currentValue);
    if (isChecked === currentlyChecked) {
        return;
    }

    if (!isChecked) {
        if (isItemized) {
            removePolicyCategoryItemizedReceiptsRequired(policyData, categoryName);
        } else {
            removePolicyCategoryReceiptsRequired(policyData, categoryName);
        }
        return;
    }

    const targetThreshold = isWaive ? CONST.DISABLED_MAX_EXPENSE_VALUE : 0;
    if (isItemized) {
        setPolicyCategoryItemizedReceiptsRequired(policyData, categoryName, targetThreshold);
    } else {
        setPolicyCategoryReceiptsRequired(policyData, categoryName, targetThreshold);
    }
}

function saveRequireFieldsRule(policyData: PolicyData, form: RequireFieldsRuleForm) {
    const categoryName = form[INPUT_IDS.CATEGORY];
    if (!categoryName || !policyData.policy?.id) {
        return;
    }

    const policyCategories = policyData.categories;
    const category = policyCategories?.[categoryName];
    const effectiveForm = getEffectiveRequireFieldsRuleForm(category, form);
    const isWaive = effectiveForm[INPUT_IDS.DIRECTION] === CONST.REQUIRE_FIELDS_RULE_DIRECTION.DO_NOT_REQUIRE;

    // Description and attendees are only editable on the `require` direction.
    if (!isWaive) {
        if (!!effectiveForm[INPUT_IDS.REQUIRE_DESCRIPTION] !== !!category?.areCommentsRequired) {
            setPolicyCategoryDescriptionRequired(policyData.policy.id, categoryName, !!effectiveForm[INPUT_IDS.REQUIRE_DESCRIPTION], policyCategories);
        }

        if (!!effectiveForm[INPUT_IDS.REQUIRE_ATTENDEES] !== !!category?.areAttendeesRequired) {
            setPolicyCategoryAttendeesRequired(policyData.policy.id, categoryName, !!effectiveForm[INPUT_IDS.REQUIRE_ATTENDEES], policyCategories);
        }
    }

    applyReceiptFieldChange(policyData, categoryName, category?.maxAmountNoReceipt, !!effectiveForm[INPUT_IDS.REQUIRE_RECEIPT], isWaive, false);
    applyReceiptFieldChange(policyData, categoryName, category?.maxAmountNoItemizedReceipt, !!effectiveForm[INPUT_IDS.REQUIRE_ITEMIZED_RECEIPT], isWaive, true);
}

function deleteRequireFieldsRule(policyData: PolicyData, categoryName: string) {
    if (!categoryName || !policyData.policy?.id) {
        return;
    }

    const policyID = policyData.policy.id;
    const policyCategories = policyData.categories;
    const category = policyCategories?.[categoryName];

    if (!category) {
        return;
    }

    if (category.areCommentsRequired) {
        setPolicyCategoryDescriptionRequired(policyID, categoryName, false, policyCategories);
    }

    if (category.areAttendeesRequired) {
        setPolicyCategoryAttendeesRequired(policyID, categoryName, false, policyCategories);
    }

    if (hasCategoryReceiptOverride(category.maxAmountNoReceipt)) {
        removePolicyCategoryReceiptsRequired(policyData, categoryName);
    }

    if (hasCategoryReceiptOverride(category.maxAmountNoItemizedReceipt)) {
        removePolicyCategoryItemizedReceiptsRequired(policyData, categoryName);
    }
}

function getRequireFieldsRuleDescription(
    translate: LocaleContextProps['translate'],
    ruleType: RequireFieldsRuleType,
    amount: number | undefined,
    convertToDisplayString: CurrencyListActionsContextType['convertToDisplayString'],
    policyCurrency: string,
): string {
    switch (ruleType) {
        case CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_DESCRIPTION:
            return translate('workspace.rules.requireFieldsTable.requireDescription');
        case CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_ATTENDEES:
            return translate('workspace.rules.requireFieldsTable.requireAttendees');
        case CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_RECEIPTS_OVER:
            if (amount === CONST.DISABLED_MAX_EXPENSE_VALUE) {
                return translate('workspace.rules.requireFieldsTable.doNotRequireReceipt');
            }
            if (amount === 0) {
                return translate('workspace.rules.requireFieldsTable.alwaysRequireReceipt');
            }
            return translate('workspace.rules.requireFieldsTable.requireReceiptOver', convertToDisplayString(amount ?? 0, policyCurrency));
        case CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_ITEMIZED_RECEIPTS_OVER:
            if (amount === CONST.DISABLED_MAX_EXPENSE_VALUE) {
                return translate('workspace.rules.requireFieldsTable.doNotRequireItemizedReceipt');
            }
            if (amount === 0) {
                return translate('workspace.rules.requireFieldsTable.requireItemizedReceipt');
            }
            return translate('workspace.rules.requireFieldsTable.requireItemizedReceiptOver', convertToDisplayString(amount ?? 0, policyCurrency));
        default:
            return '';
    }
}

function getRequireFieldsPendingAction(pendingFields: PolicyCategories[string]['pendingFields']): PendingAction | undefined {
    const pendingActions = [pendingFields?.areCommentsRequired, pendingFields?.areAttendeesRequired, pendingFields?.maxAmountNoReceipt, pendingFields?.maxAmountNoItemizedReceipt].filter(
        (pendingAction): pendingAction is PendingAction => !!pendingAction,
    );

    return pendingActions.find((pendingAction) => isPendingDeleteOrUpdate(pendingAction)) ?? pendingActions.at(0);
}

function formatRequireFieldsRuleDescriptions(descriptions: string[]): string {
    if (descriptions.length === 0) {
        return '';
    }

    const [first, ...rest] = descriptions;
    const capitalizedFirst = first.charAt(0).toUpperCase() + first.slice(1);
    const lowercasedRest = rest.map((description) => description.charAt(0).toLowerCase() + description.slice(1));

    return [capitalizedFirst, ...lowercasedRest].join(', ');
}

function getRequireFieldsRuleDescriptionsForCategory(
    category: PolicyCategory,
    translate: LocaleContextProps['translate'],
    convertToDisplayString: CurrencyListActionsContextType['convertToDisplayString'],
    policyCurrency: string,
): string[] {
    const descriptions: string[] = [];

    if (category.areCommentsRequired) {
        descriptions.push(getRequireFieldsRuleDescription(translate, CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_DESCRIPTION, undefined, convertToDisplayString, policyCurrency));
    }

    if (hasCategoryReceiptOverride(category.maxAmountNoReceipt)) {
        descriptions.push(
            getRequireFieldsRuleDescription(
                translate,
                CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_RECEIPTS_OVER,
                category.maxAmountNoReceipt ?? undefined,
                convertToDisplayString,
                policyCurrency,
            ),
        );
    }

    if (hasCategoryReceiptOverride(category.maxAmountNoItemizedReceipt)) {
        descriptions.push(
            getRequireFieldsRuleDescription(
                translate,
                CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_ITEMIZED_RECEIPTS_OVER,
                category.maxAmountNoItemizedReceipt ?? undefined,
                convertToDisplayString,
                policyCurrency,
            ),
        );
    }

    if (category.areAttendeesRequired) {
        descriptions.push(getRequireFieldsRuleDescription(translate, CONST.REQUIRE_FIELDS_RULE_TYPES.REQUIRE_ATTENDEES, undefined, convertToDisplayString, policyCurrency));
    }

    return descriptions;
}

function getRequireFieldsTableData({
    policy,
    policyCategories,
    translate,
    convertToDisplayString,
    localeCompare,
    isOffline,
    onNavigate,
}: {
    policy: Policy | undefined;
    policyCategories: PolicyCategories | undefined;
    translate: LocaleContextProps['translate'];
    convertToDisplayString: CurrencyListActionsContextType['convertToDisplayString'];
    localeCompare: LocaleContextProps['localeCompare'];
    isOffline: boolean;
    onNavigate: (route: Route) => void;
}): RequireFieldsTableItem[] {
    if (!policy?.id || !policyCategories) {
        return [];
    }

    const policyID = policy.id;
    const policyCurrency = policy.outputCurrency ?? CONST.CURRENCY.USD;
    const rules: RequireFieldsTableItem[] = [];

    for (const [categoryName, category] of Object.entries(policyCategories)) {
        if (!category?.enabled) {
            continue;
        }

        const pendingAction = getRequireFieldsPendingAction(category.pendingFields);
        const isPendingDelete = pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;

        if (!isOffline && isPendingDelete) {
            continue;
        }

        if (!categoryHasAnyRequireFieldsRule(category) && !isPendingDelete) {
            continue;
        }

        const decodedCategoryName = getDecodedCategoryName(categoryName);
        const typeLabel =
            getRequireFieldsRuleDirection(category) === CONST.REQUIRE_FIELDS_RULE_DIRECTION.DO_NOT_REQUIRE
                ? translate('workspace.rules.requireFieldsTable.typeLabelDoNotRequire')
                : translate('workspace.rules.requireFieldsTable.typeLabelRequire');
        const conditionText = translate('workspace.rules.requireFieldsTable.conditionCategoryIs', decodedCategoryName);
        const ruleDescriptions = getRequireFieldsRuleDescriptionsForCategory(category, translate, convertToDisplayString, policyCurrency);
        const ruleDescription = formatRequireFieldsRuleDescriptions(ruleDescriptions);

        rules.push({
            keyForList: categoryName,
            ruleID: categoryName,
            categoryName,
            typeLabel,
            conditionText,
            ruleDescription,
            searchTokens: [decodedCategoryName, ruleDescription, typeLabel, ...ruleDescriptions],
            pendingAction,
            disabled: pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
            action: () => onNavigate(getRequireFieldsRuleNavigationRoute(policyID, categoryName)),
        });
    }

    return rules.sort((a, b) => localeCompare(a.conditionText, b.conditionText));
}

export {
    categoryHasLegacyReceiptRules,
    deleteRequireFieldsRule,
    getEffectiveRequireFieldsRuleForm,
    getRequireFieldsFormFromCategory,
    getRequireFieldsRuleDirection,
    getRequireFieldsTableData,
    saveRequireFieldsRule,
};
export type {RequireFieldsTableItem};

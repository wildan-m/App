import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import type {ViolationName} from '@src/types/onyx';

import type {ValueOf} from 'type-fest';

type SubmittedTransactionViolationShortName = Exclude<ValueOf<typeof CONST.VIOLATIONS>, typeof CONST.VIOLATIONS.RULE_VIOLATION>;

const SUBMITTED_TRANSACTION_VIOLATION_SHORT_NAME_SET = new Set<string>(Object.values(CONST.VIOLATIONS).filter((name) => name !== CONST.VIOLATIONS.RULE_VIOLATION));

const VIOLATION_NAME_SET = new Set<string>(Object.values(CONST.VIOLATIONS));

const HIDDEN_VIOLATION_FILTER_VALUE_SET = new Set<string>(CONST.SEARCH.HIDDEN_VIOLATION_FILTER_VALUES);

/** Violation names the search violation filter offers, built from CONST.VIOLATIONS so new violations are picked up automatically */
const SELECTABLE_VIOLATIONS: ViolationName[] = Object.values(CONST.VIOLATIONS).filter((name) => !HIDDEN_VIOLATION_FILTER_VALUE_SET.has(name));

function isSubmittedTransactionViolationShortName(name: string): name is SubmittedTransactionViolationShortName {
    return SUBMITTED_TRANSACTION_VIOLATION_SHORT_NAME_SET.has(name);
}

function isViolationName(name: string): name is ViolationName {
    return VIOLATION_NAME_SET.has(name);
}

/**
 * Returns a parameter-free display label for a violation name.
 * Falls back to the raw identifier when no short-name translation exists.
 */
function getViolationDisplayName(violationName: string, translate: LocalizedTranslate): string {
    if (violationName === CONST.VIOLATIONS.RULE_VIOLATION) {
        return translate('violations.shortName.customRules');
    }
    return isSubmittedTransactionViolationShortName(violationName) ? translate(`violations.shortName.${violationName}`) : violationName;
}

export default getViolationDisplayName;
export {SELECTABLE_VIOLATIONS, isViolationName};

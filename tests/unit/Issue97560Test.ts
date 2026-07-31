import type {LocaleContextProps} from '@components/LocaleContextProvider';

import {getRequireFieldsRuleValidationError} from '@libs/RequireFieldsRulesUtils';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/RequireFieldsRuleForm';
import type {RequireFieldsRuleForm, RequireFieldsRuleSettingFieldKey} from '@src/types/form/RequireFieldsRuleForm';
import type {PolicyCategory} from '@src/types/onyx';

const CATEGORY_NAME = 'Advertising';

// Returns the key so a failed validation is identifiable without the locale files.
const translate: LocaleContextProps['translate'] = (path) => path;

/** A category whose field requirements rule already requires description, attendees, receipt and itemized receipt. */
function buildFullyRequiredCategory(): PolicyCategory {
    return {
        name: CATEGORY_NAME,
        enabled: true,
        areCommentsRequired: true,
        areAttendeesRequired: true,
        maxAmountNoReceipt: 0,
        maxAmountNoItemizedReceipt: 0,
    } as PolicyCategory;
}

function buildCategoryWithoutRules(): PolicyCategory {
    return {
        name: CATEGORY_NAME,
        enabled: true,
    } as PolicyCategory;
}

/**
 * Only the settings passed here stand for what the user picked; the create-mode check reads a field
 * exclusively when it is in the touched set, so the untouched defaults below never affect the result.
 */
function buildForm(settings: Partial<RequireFieldsRuleForm>): RequireFieldsRuleForm {
    return {
        [INPUT_IDS.CATEGORY]: CATEGORY_NAME,
        [INPUT_IDS.DESCRIPTION_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE,
        [INPUT_IDS.ATTENDEES_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE,
        [INPUT_IDS.RECEIPT_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE,
        [INPUT_IDS.ITEMIZED_RECEIPT_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE,
        ...settings,
    };
}

function touched(...fieldKeys: RequireFieldsRuleSettingFieldKey[]): Set<RequireFieldsRuleSettingFieldKey> {
    return new Set(fieldKeys);
}

describe('getRequireFieldsRuleValidationError', () => {
    describe('creating a rule on a category that already has one', () => {
        it('accepts Require on every field even though the category already requires them all', () => {
            const form = buildForm({
                [INPUT_IDS.DESCRIPTION_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.REQUIRE,
                [INPUT_IDS.ATTENDEES_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.REQUIRE,
                [INPUT_IDS.RECEIPT_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.REQUIRE,
                [INPUT_IDS.ITEMIZED_RECEIPT_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.REQUIRE,
            });

            const error = getRequireFieldsRuleValidationError(
                form,
                buildFullyRequiredCategory(),
                translate,
                false,
                touched(INPUT_IDS.DESCRIPTION_SETTING, INPUT_IDS.ATTENDEES_SETTING, INPUT_IDS.RECEIPT_SETTING, INPUT_IDS.ITEMIZED_RECEIPT_SETTING),
            );

            expect(error).toBe('');
        });

        it('accepts a single Require that the category already has', () => {
            const form = buildForm({[INPUT_IDS.DESCRIPTION_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.REQUIRE});

            const error = getRequireFieldsRuleValidationError(form, buildFullyRequiredCategory(), translate, false, touched(INPUT_IDS.DESCRIPTION_SETTING));

            expect(error).toBe('');
        });
    });

    describe('creating a rule on a category with no rule yet', () => {
        it('accepts Require on a field the category does not require', () => {
            const form = buildForm({[INPUT_IDS.DESCRIPTION_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.REQUIRE});

            const error = getRequireFieldsRuleValidationError(form, buildCategoryWithoutRules(), translate, false, touched(INPUT_IDS.DESCRIPTION_SETTING));

            expect(error).toBe('');
        });

        it('accepts an explicit receipt waive', () => {
            const form = buildForm({[INPUT_IDS.RECEIPT_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE});

            const error = getRequireFieldsRuleValidationError(form, buildCategoryWithoutRules(), translate, false, touched(INPUT_IDS.RECEIPT_SETTING));

            expect(error).toBe('');
        });
    });

    describe('guarding against forms that cannot persist anything', () => {
        it('rejects a form where nothing was selected', () => {
            const error = getRequireFieldsRuleValidationError(buildForm({}), buildCategoryWithoutRules(), translate, false, touched());

            expect(error).toBe('workspace.rules.requireFieldsRule.confirmErrorDoNotRequireField');
        });

        it("rejects a form holding only Don't require on description and attendees", () => {
            const form = buildForm({
                [INPUT_IDS.DESCRIPTION_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE,
                [INPUT_IDS.ATTENDEES_SETTING]: CONST.FIELD_REQUIREMENTS_DIRECTION.DO_NOT_REQUIRE,
            });

            const error = getRequireFieldsRuleValidationError(form, buildFullyRequiredCategory(), translate, false, touched(INPUT_IDS.DESCRIPTION_SETTING, INPUT_IDS.ATTENDEES_SETTING));

            expect(error).toBe('workspace.rules.requireFieldsRule.confirmErrorDoNotRequireField');
        });

        it('rejects a form with no category selected', () => {
            const formWithoutCategory = buildForm({[INPUT_IDS.CATEGORY]: ''});

            const error = getRequireFieldsRuleValidationError(formWithoutCategory, undefined, translate, false, touched());

            expect(error).toBe('workspace.rules.requireFieldsRule.confirmErrorCategory');
        });
    });

    it('never blocks the edit flow', () => {
        const error = getRequireFieldsRuleValidationError(buildForm({}), buildFullyRequiredCategory(), translate, true, touched());

        expect(error).toBe('');
    });
});

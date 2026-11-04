import type {Rule} from 'eslint';

import {RuleTester} from 'eslint';
import {parser as tsParser} from 'typescript-eslint';

type LocalRuleModule = Rule.RuleModule & {
    name: string;
};

function isLocalRuleModule(ruleModule: unknown): ruleModule is LocalRuleModule {
    if (typeof ruleModule !== 'object' || ruleModule === null) {
        return false;
    }

    const ruleName: unknown = Reflect.get(ruleModule, 'name');
    const create: unknown = Reflect.get(ruleModule, 'create');
    const meta: unknown = Reflect.get(ruleModule, 'meta');

    return typeof ruleName === 'string' && typeof create === 'function' && typeof meta === 'object' && meta !== null;
}

const ruleModule: unknown = require('../../eslint-plugin-local-rules/prefer-destructured-lazy-icons');

if (!isLocalRuleModule(ruleModule)) {
    throw new TypeError('Expected prefer-destructured-lazy-icons to export an ESLint rule module.');
}

const tsRuleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: tsParser,
        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
});

describe('prefer-destructured-lazy-icons', () => {
    // Given the lazy icon hooks return a new map object on every render
    // When a consumer keeps, passes, spreads or returns that map instead of destructuring it
    // Then the rule reports it, because anything depending on the map is invalidated every render
    tsRuleTester.run(ruleModule.name, ruleModule, {
        valid: [
            "const {Plus, Trashcan} = useMemoizedLazyExpensifyIcons(['Plus', 'Trashcan']);",
            "const {Columns: columnsIcon} = useMemoizedLazyExpensifyIcons(['Columns']);",
            "const {Telescope} = useMemoizedLazyIllustrations(['Telescope']);",
            'const {Plus} = useMemoizedLazyExpensifyIcons(MEMOIZED_ICONS);',
            "const icons = useSomeOtherIcons(['Plus']);",
            // Names only known at runtime cannot be destructured, so the map is still read by key
            'const icons = useMemoizedLazyExpensifyIcons(SEARCH_TYPE_MENU_ICON_NAMES);',
            "const icons = useMemoizedLazyExpensifyIcons([...SAVED_SEARCH_ICON_NAMES, 'Pencil']);",
            "const icons = useMemoizedLazyExpensifyIcons(['ArrowRight', icon]);",
        ],
        invalid: [
            {
                code: "const icons = useMemoizedLazyExpensifyIcons(['DownArrow', 'UpArrow'] as const) as Partial<Record<ExpensifyIconName, IconAsset>>;",
                errors: [{messageId: 'destructure'}],
            },
            {
                code: "const icons = useMemoizedLazyExpensifyIcons(['Plus']);",
                errors: [{messageId: 'destructure'}],
            },
            {
                code: "const illustrations = useMemoizedLazyIllustrations(['Telescope']);",
                errors: [{messageId: 'destructure'}],
            },
            {
                code: "const {Plus, ...rest} = useMemoizedLazyExpensifyIcons(['Plus', 'Trashcan']);",
                errors: [{messageId: 'destructure'}],
            },
            {
                code: "getIntegrationIcon(connectionName, useMemoizedLazyExpensifyIcons(['XeroSquare']), policy);",
                errors: [{messageId: 'destructure'}],
            },
            {
                code: "function useIcons() { return useMemoizedLazyExpensifyIcons(['Plus']); }",
                errors: [{messageId: 'destructure'}],
            },
            {
                code: "const options = {...useMemoizedLazyExpensifyIcons(['Plus'])};",
                errors: [{messageId: 'destructure'}],
            },
        ],
    });
});

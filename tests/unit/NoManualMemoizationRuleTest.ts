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

const ruleModule: unknown = require('../../eslint-plugin-local-rules/no-manual-memoization');

if (!isLocalRuleModule(ruleModule)) {
    throw new TypeError('Expected no-manual-memoization to export an ESLint rule module.');
}

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
});

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

describe('no-manual-memoization', () => {
    ruleTester.run(ruleModule.name, ruleModule, {
        valid: [
            // Code without memoization is untouched.
            "import {useState} from 'react'; function C() { const [a] = useState(1); return a; }",
            // Only bindings that come from the react module are flagged.
            "import {useMemo} from './shim'; const v = useMemo(() => 1, []);",
            "import memoize from 'lodash/memoize'; const f = memoize(() => 1);",
            'function memo(f) { return f; } const C = memo(() => null);',
            "import {Memo} from 'react'; const C = Memo(() => null);",
            // A namespace that is not bound to react is untouched.
            "import * as R from './react-like'; const v = R.useMemo(() => 1, []);",
            // useFocusEffect warns when its callback is not wrapped, so that wrapping stays allowed.
            "import {useCallback} from 'react'; import {useFocusEffect} from '@react-navigation/native'; function C() { useFocusEffect(useCallback(() => {}, [])); return null; }",
            "import {useCallback} from 'react'; import {useFocusEffect} from '@react-navigation/native'; function C() { const handleFocus = useCallback(() => {}, []); useFocusEffect(handleFocus); return null; }",
        ],
        invalid: [
            {
                code: "import {useMemo} from 'react'; function C({list}) { const sorted = useMemo(() => list.sort(), [list]); return sorted; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useMemo'}}],
            },
            {
                code: "import {useCallback} from 'react'; function C() { const onPress = useCallback(() => {}, []); return onPress; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useCallback'}}],
            },
            {
                code: "import {memo} from 'react'; const C = memo(() => null);",
                errors: [{messageId: 'manualMemoization', data: {api: 'memo'}}],
            },
            // Aliased imports still resolve to the react API they name.
            {
                code: "import {useMemo as useMemoAlias} from 'react'; const v = useMemoAlias(() => 1, []);",
                errors: [{messageId: 'manualMemoization', data: {api: 'useMemo'}}],
            },
            // Default and namespace member access are the same APIs.
            {
                code: "import React from 'react'; const C = React.memo(() => null);",
                errors: [{messageId: 'manualMemoization', data: {api: 'memo'}}],
            },
            {
                code: "import * as React from 'react'; function C() { const v = React.useMemo(() => 1, []); return v; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useMemo'}}],
            },
            // The useFocusEffect exception only covers useCallback, not the other APIs.
            {
                code: "import {useMemo} from 'react'; import {useFocusEffect} from '@react-navigation/native'; function C() { useFocusEffect(useMemo(() => () => {}, [])); return null; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useMemo'}}],
            },
            // A callback that is also read outside useFocusEffect is ordinary manual memoization.
            {
                code: "import {useCallback} from 'react'; import {useFocusEffect} from '@react-navigation/native'; function C() { const handleFocus = useCallback(() => {}, []); useFocusEffect(handleFocus); handleFocus(); return null; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useCallback'}}],
            },
            // A wrapped callback that is never read gets no exception either.
            {
                code: "import {useCallback} from 'react'; function C() { const unused = useCallback(() => {}, []); return null; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useCallback'}}],
            },
        ],
    });

    tsRuleTester.run(`${ruleModule.name} (TypeScript)`, ruleModule, {
        valid: [
            // TypeScript wrappers between the callback and useFocusEffect do not break the exception.
            "import {useCallback} from 'react'; import {useFocusEffect} from '@react-navigation/native'; function C() { useFocusEffect(useCallback(() => {}, []) as () => void); return null; }",
            "import {useCallback} from 'react'; import {useFocusEffect} from '@react-navigation/native'; function C() { const handleFocus = useCallback(() => {}, []) as () => void; useFocusEffect(handleFocus); return null; }",
        ],
        invalid: [
            {
                code: "import {useMemo} from 'react'; function C({list}: {list: string[]}) { const sorted = useMemo(() => list.sort(), [list]) as string[]; return sorted; }",
                errors: [{messageId: 'manualMemoization', data: {api: 'useMemo'}}],
            },
        ],
    });
});

const name = 'no-manual-memoization';

const meta = {
    type: 'problem',
    docs: {
        description:
            'Disallow manual memoization (React.memo, useMemo, useCallback) in components that compile with React Compiler. The compiler memoizes automatically, so manual memoization only adds complexity and room for dependency-array mistakes.',
        recommended: 'error',
    },
    schema: [],
    messages: {
        manualMemoization:
            'Manual memoization with `{{api}}` is not allowed in components that compile with React Compiler — the compiler already memoizes them. Remove the `{{api}}` wrapper (see contributingGuides/REACT_COMPILER.md).',
    },
};

const MEMOIZATION_APIS = new Set(['memo', 'useMemo', 'useCallback']);
const REACT_MODULE_NAME = 'react';
const FOCUS_EFFECT_HOOK_NAME = 'useFocusEffect';

const TS_WRAPPER_TYPES = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion']);

/**
 * Steps up through TypeScript wrapper nodes so `useFocusEffect(callback as EffectCallback)` still
 * recognizes `callback` as the call argument.
 *
 * @param {import('estree').Node} node
 * @returns {{node: import('estree').Node, parent: import('estree').Node | undefined}}
 */
function skipTSWrappersUpward(node) {
    let current = node;
    let parent = current.parent;
    while (parent && TS_WRAPPER_TYPES.has(parent.type)) {
        current = parent;
        parent = current.parent;
    }
    return {node: current, parent};
}

/**
 * `useFocusEffect` warns at runtime when its callback is not wrapped with `useCallback`, so that
 * wrapping stays allowed. Matched by name rather than import binding because the hook may come from
 * `@react-navigation/native` directly or be re-exported.
 *
 * @param {import('estree').Node} callee
 * @returns {boolean}
 */
function isUseFocusEffectCallee(callee) {
    if (callee.type === 'Identifier') {
        return callee.name === FOCUS_EFFECT_HOOK_NAME;
    }
    return callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.property.name === FOCUS_EFFECT_HOOK_NAME;
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isArgumentOfUseFocusEffect(node) {
    const {node: unwrapped, parent} = skipTSWrappersUpward(node);
    if (!parent || parent.type !== 'CallExpression') {
        return false;
    }
    return parent.arguments.includes(unwrapped) && isUseFocusEffectCallee(parent.callee);
}

/**
 * Flags every call to React's memoization APIs. The lint pipeline's ReactCompilerFilter then keeps
 * these messages only for files that both React Compilers memoize, so manual memoization stays
 * allowed in files the compiler skips.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @returns {import('eslint').Rule.RuleListener}
 */
function create(context) {
    /** Local binding name -> React memoization API it refers to (`memo`, `useMemo` or `useCallback`). */
    const memoizationBindings = new Map();
    /** Local names bound to the React module itself (default or namespace import). */
    const reactModuleBindings = new Set();

    /**
     * @param {import('estree').Node} callee
     * @returns {string | undefined}
     */
    function getMemoizationApi(callee) {
        if (callee.type === 'Identifier') {
            return memoizationBindings.get(callee.name);
        }
        if (callee.type !== 'MemberExpression' || callee.computed) {
            return undefined;
        }
        if (callee.object.type !== 'Identifier' || !reactModuleBindings.has(callee.object.name)) {
            return undefined;
        }
        if (callee.property.type !== 'Identifier' || !MEMOIZATION_APIS.has(callee.property.name)) {
            return undefined;
        }
        return callee.property.name;
    }

    /**
     * A `useCallback` call is excepted when its result is handed to `useFocusEffect`, either
     * directly or through a variable whose every read is a `useFocusEffect` argument.
     *
     * @param {import('estree').Node} callNode
     * @returns {boolean}
     */
    function isUseFocusEffectException(callNode) {
        if (isArgumentOfUseFocusEffect(callNode)) {
            return true;
        }
        const {parent} = skipTSWrappersUpward(callNode);
        if (!parent || parent.type !== 'VariableDeclarator' || parent.id.type !== 'Identifier') {
            return false;
        }
        const variable = context.sourceCode.getDeclaredVariables(parent).at(0);
        if (!variable) {
            return false;
        }
        const reads = variable.references.filter((reference) => reference.isRead());
        if (reads.length === 0) {
            return false;
        }
        return reads.every((reference) => isArgumentOfUseFocusEffect(reference.identifier));
    }

    return {
        ImportDeclaration(node) {
            if (node.source.value !== REACT_MODULE_NAME) {
                return;
            }
            for (const specifier of node.specifiers) {
                if (specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier' && MEMOIZATION_APIS.has(specifier.imported.name)) {
                    memoizationBindings.set(specifier.local.name, specifier.imported.name);
                } else if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
                    reactModuleBindings.add(specifier.local.name);
                }
            }
        },
        CallExpression(node) {
            const api = getMemoizationApi(node.callee);
            if (api === undefined) {
                return;
            }
            if (api === 'useCallback' && isUseFocusEffectException(node)) {
                return;
            }
            context.report({
                node: node.callee,
                messageId: 'manualMemoization',
                data: {api},
            });
        },
    };
}

export {name, meta, create};

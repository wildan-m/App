const name = 'prefer-destructured-lazy-icons';

const LAZY_ICON_HOOKS = new Set(['useMemoizedLazyExpensifyIcons', 'useMemoizedLazyIllustrations']);

const meta = {
    type: 'problem',
    docs: {
        description: 'Require destructuring the icons returned by the lazy icon hooks instead of keeping the whole icon map.',
        recommended: 'error',
    },
    schema: [],
    messages: {
        destructure:
            '{{hook}} returns a new icon map on every render. Destructure the icons you need (for example `const {Plus} = {{hook}}([...])`) so memoized values depend on the stable icons, not the map.',
    },
};

function unwrapTypeAssertions(node) {
    let current = node;
    while (current?.type === 'TSAsExpression' || current?.type === 'TSSatisfiesExpression') {
        current = current.expression;
    }
    return current;
}

/** Only a literal list of icon names can be destructured; a list built at runtime has to be read by key. */
function hasStaticIconNames(node) {
    const names = unwrapTypeAssertions(node.arguments.at(0));
    return names?.type === 'ArrayExpression' && names.elements.every((element) => element?.type === 'Literal' && typeof element.value === 'string');
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
    function isDestructured(node) {
        const parent = node.parent;
        if (parent?.type !== 'VariableDeclarator' || parent.init !== node || parent.id.type !== 'ObjectPattern') {
            return false;
        }
        return parent.id.properties.every((property) => property.type !== 'RestElement');
    }

    return {
        CallExpression(node) {
            if (node.callee.type !== 'Identifier' || !LAZY_ICON_HOOKS.has(node.callee.name) || !hasStaticIconNames(node) || isDestructured(node)) {
                return;
            }
            context.report({node, messageId: 'destructure', data: {hook: node.callee.name}});
        },
    };
}

export {name, meta, create};

const name = 'no-raw-typography';

const meta = {
    type: 'problem',
    docs: {
        description: 'Disallow raw numeric fontSize/lineHeight values. Type must come from the typography scale so it cannot drift from the design system.',
        recommended: 'error',
    },
    schema: [],
    messages: {
        rawTypography: 'Raw `{{property}}: {{value}}` is not allowed. Use a `<Text variant="...">` or a token from src/styles/typography.ts (https://github.com/Expensify/App/issues/37503).',
        rawVariableKey: 'New `{{property}}` keys must not be added here. Add the size to the scale in src/styles/typography.ts instead (https://github.com/Expensify/App/issues/37503).',
    },
};

const BANNED_PROPERTIES = new Set(['fontSize', 'lineHeight']);
const BANNED_VARIABLE_PREFIXES = ['fontSize', 'lineHeight'];

/**
 * @param {import('estree').Node} key
 * @returns {string | undefined}
 */
function getPropertyName(key) {
    if (key.type === 'Identifier') {
        return key.name;
    }
    if (key.type === 'Literal' && typeof key.value === 'string') {
        return key.value;
    }
    return undefined;
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
const TS_WRAPPER_TYPES = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion']);

function isNumericLiteral(node) {
    if (TS_WRAPPER_TYPES.has(node.type)) {
        return isNumericLiteral(node.expression);
    }
    if (node.type === 'Literal' && typeof node.value === 'number') {
        return true;
    }
    return node.type === 'UnaryExpression' && (node.operator === '-' || node.operator === '+') && isNumericLiteral(node.argument);
}

/**
 * @param {string} propertyName
 * @returns {boolean}
 */
function isTypographyVariableName(propertyName) {
    return BANNED_VARIABLE_PREFIXES.some((prefix) => propertyName.startsWith(prefix));
}

/**
 * Matches `variables.fontSize*` / `variables.lineHeight*` member expressions, which bypass the
 * typography scale just as effectively as a raw number does.
 *
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isTypographyVariableRef(node) {
    if (TS_WRAPPER_TYPES.has(node.type)) {
        return isTypographyVariableRef(node.expression);
    }
    if (node.type !== 'MemberExpression' || node.computed) {
        return false;
    }
    if (node.object.type !== 'Identifier' || node.object.name !== 'variables') {
        return false;
    }
    return node.property.type === 'Identifier' && isTypographyVariableName(node.property.name);
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isRawTypographyValue(node) {
    return isNumericLiteral(node) || isTypographyVariableRef(node);
}

/**
 * Flags object properties (`{fontSize: 17}`) and JSX attributes (`<Text fontSize={17}>`) that set
 * `fontSize`/`lineHeight` to a numeric literal or a `variables.fontSize*`/`variables.lineHeight*`
 * reference. References to typography tokens or computed values are allowed.
 *
 * In `src/styles/variables.ts` the generic checks are skipped; instead every `fontSize*`/`lineHeight*`
 * key declared there is flagged, so the grandfathered eslint-seatbelt count blocks new raw size keys
 * while the existing ones keep working until they are migrated to the scale.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @returns {import('eslint').Rule.RuleListener}
 */
function create(context) {
    function report(valueNode, propertyName) {
        context.report({
            node: valueNode,
            messageId: 'rawTypography',
            data: {
                property: propertyName,
                value: context.sourceCode.getText(valueNode),
            },
        });
    }

    if (context.filename.replaceAll('\\', '/').endsWith('src/styles/variables.ts')) {
        return {
            Property(node) {
                if (node.computed) {
                    return;
                }
                const propertyName = getPropertyName(node.key);
                if (propertyName === undefined || !isTypographyVariableName(propertyName)) {
                    return;
                }
                context.report({
                    node: node.key,
                    messageId: 'rawVariableKey',
                    data: {property: propertyName},
                });
            },
        };
    }

    return {
        Property(node) {
            if (node.computed) {
                return;
            }
            const propertyName = getPropertyName(node.key);
            if (propertyName === undefined || !BANNED_PROPERTIES.has(propertyName) || !isRawTypographyValue(node.value)) {
                return;
            }
            report(node.value, propertyName);
        },
        JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier' || !BANNED_PROPERTIES.has(node.name.name)) {
                return;
            }
            if (node.value?.type !== 'JSXExpressionContainer' || !isRawTypographyValue(node.value.expression)) {
                return;
            }
            report(node.value.expression, node.name.name);
        },
    };
}

export {name, meta, create};

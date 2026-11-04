/**
 * Keeps the top-level statements of a component in one order: inputs and context, Onyx subscriptions and
 * other external data, component-owned state and refs, derived values, event handlers, effects, then render.
 *
 * Two kinds of report:
 * - `outOfOrder`: a statement sits after a later section and nothing it reads forces it there. Statements
 *   that depend on something declared or written by an earlier statement are never reported, so a hook
 *   whose argument is a derived value can stay after that value.
 * - `hookSplitsComputation`: a value React Compiler treats as mutable (an object, array, or call result)
 *   is created before a hook call and then passed to, or has a method called by, code after that hook. The
 *   compiler cannot put a hook inside a memo block, so it drops the block for that value and everything
 *   built from it.
 *
 * The autofix never moves a hook, so hook order never changes. It only moves a derived value or handler
 * declaration up past effects and handlers, which evaluate nothing the moved statement could observe, and it
 * leaves a statement in place when the move would change what React Compiler can cache: a mutable value that
 * is called with later, or a call with a value that a hook it would pass has already captured.
 */
const name = 'component-order';

const INPUTS = 0;
const SUBSCRIPTIONS = 1;
const STATE = 2;
const DERIVED = 3;
const HANDLERS = 4;
const EFFECTS = 5;
const RENDER = 6;

const SECTION_NAMES = ['inputs and context', 'Onyx subscriptions and external data', 'state and refs', 'derived values', 'event handlers', 'effects'];

const INPUT_HOOKS = new Set([
    'use',
    'useContext',
    'useLocalize',
    'useTheme',
    'useThemeStyles',
    'useStyleUtils',
    'useThemeIllustrations',
    'useResponsiveLayout',
    'useWindowDimensions',
    'useSafeAreaInsets',
    'useSafeAreaPaddings',
    'useStyledSafeAreaInsets',
    'useNetwork',
    'useRoute',
    'useNavigation',
    'useIsFocused',
    'useEnvironment',
    'usePermissions',
    'useCurrentUserPersonalDetails',
]);
const SUBSCRIPTION_HOOKS = new Set(['useOnyx', 'useSyncExternalStore']);
const STATE_HOOKS = new Set(['useState', 'useReducer', 'useRef', 'useId', 'useTransition', 'useActionState', 'useOptimistic']);
const DERIVED_HOOKS = new Set(['useMemo', 'useDeferredValue']);
const HANDLER_HOOKS = new Set(['useCallback', 'useEffectEvent']);
const EFFECT_HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useImperativeHandle', 'useFocusEffect']);

const HOOK_NAME_PATTERN = /^use[A-Z0-9]|^use$/;
const COMPONENT_NAME_PATTERN = /^[A-Z]/;
const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const WRAPPER_TYPES = new Set(['ChainExpression', 'TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'ParenthesizedExpression', 'AwaitExpression']);
const MUTABLE_INIT_TYPES = new Set(['ArrayExpression', 'ObjectExpression', 'NewExpression', 'CallExpression', 'TaggedTemplateExpression']);
const SKIPPED_KEYS = new Set(['parent', 'loc', 'range', 'typeAnnotation', 'returnType', 'typeParameters', 'typeArguments']);

const meta = {
    type: 'suggestion',
    fixable: 'code',
    docs: {
        description: 'Enforce a consistent order of statements inside components so they read top to bottom and React Compiler can memoize them.',
        recommended: 'error',
    },
    schema: [],
    messages: {
        outOfOrder:
            'Move this {{section}} above the {{laterSection}} on line {{line}}. Components read inputs and context, Onyx subscriptions, state and refs, derived values, event handlers, effects, then render.',
        hookSplitsComputation:
            '`{{variable}}` is created before {{hook}} (line {{hookLine}}) and used by a call after it, so React Compiler cannot cache `{{variable}}` or anything computed from it. Compute it after {{hook}}, or finish using it before.',
    },
};

function unwrap(node) {
    let current = node;
    while (current && WRAPPER_TYPES.has(current.type)) {
        current = current.expression;
    }
    return current;
}

function getHookName(callExpression) {
    const callee = unwrap(callExpression.callee);
    if (callee?.type === 'Identifier') {
        return HOOK_NAME_PATTERN.test(callee.name) ? callee.name : undefined;
    }
    if (callee?.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
        return HOOK_NAME_PATTERN.test(callee.property.name) ? callee.property.name : undefined;
    }
    return undefined;
}

/** Calls `visit` on every node of `root` outside nested functions. */
function walkOutsideFunctions(root, visit) {
    const stack = [root];
    while (stack.length > 0) {
        const node = stack.pop();
        if (node !== root && FUNCTION_TYPES.has(node.type)) {
            continue;
        }
        if (visit(node) === false) {
            return;
        }
        for (const key of Object.keys(node)) {
            if (SKIPPED_KEYS.has(key)) {
                continue;
            }
            const value = node[key];
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child && typeof child.type === 'string') {
                        stack.push(child);
                    }
                }
            } else if (value && typeof value.type === 'string') {
                stack.push(value);
            }
        }
    }
}

function findFirstHookName(statement) {
    let hookName;
    walkOutsideFunctions(statement, (node) => {
        if (node.type === 'CallExpression') {
            const candidate = getHookName(node);
            if (candidate) {
                hookName = candidate;
                return false;
            }
        }
        return true;
    });
    return hookName;
}

function containsReturn(statement) {
    let found = false;
    walkOutsideFunctions(statement, (node) => {
        if (node.type === 'ReturnStatement') {
            found = true;
            return false;
        }
        return true;
    });
    return found;
}

function hasAssignment(statement) {
    let found = false;
    walkOutsideFunctions(statement, (node) => {
        if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
            found = true;
            return false;
        }
        return true;
    });
    return found;
}

/** The section range a hook belongs to. Hooks the rule doesn't know may sit anywhere among the hook sections. */
function getHookSections(hookName) {
    if (INPUT_HOOKS.has(hookName)) {
        return [INPUTS, INPUTS];
    }
    if (SUBSCRIPTION_HOOKS.has(hookName)) {
        return [SUBSCRIPTIONS, SUBSCRIPTIONS];
    }
    if (STATE_HOOKS.has(hookName)) {
        return [STATE, STATE];
    }
    if (DERIVED_HOOKS.has(hookName)) {
        return [DERIVED, DERIVED];
    }
    if (HANDLER_HOOKS.has(hookName)) {
        return [HANDLERS, HANDLERS];
    }
    if (EFFECT_HOOKS.has(hookName)) {
        return [EFFECTS, EFFECTS];
    }
    return [INPUTS, STATE];
}

function isFunctionValuedDeclaration(statement) {
    return (
        statement.type === 'VariableDeclaration' &&
        statement.declarations.length === 1 &&
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(unwrap(statement.declarations[0].init)?.type)
    );
}

function getComponentName(node) {
    if (node.id?.type === 'Identifier') {
        return node.id.name;
    }
    let parent = node.parent;
    // memo(function Foo() {}) and forwardRef(...) wrappers.
    while (parent?.type === 'CallExpression') {
        parent = parent.parent;
    }
    if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        return parent.id.name;
    }
    return undefined;
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
    const {sourceCode} = context;
    let currentComponent;

    function classify(statement) {
        if (statement.type.startsWith('TS') || statement.type === 'EmptyStatement') {
            return undefined;
        }
        const hookName = findFirstHookName(statement);
        if (hookName) {
            const [low, high] = getHookSections(hookName);
            return {low, high, hookName};
        }
        if (statement.type === 'FunctionDeclaration' || isFunctionValuedDeclaration(statement)) {
            return {low: HANDLERS, high: HANDLERS};
        }
        return {low: DERIVED, high: DERIVED};
    }

    function indexOfStatement(entries, node) {
        return entries.findIndex(({statement}) => statement.range[0] <= node.range[0] && node.range[1] <= statement.range[1]);
    }

    /** Whether `node` runs in a function inside the component instead of during render. */
    function isInsideNestedFunction(node) {
        let current = node.parent;
        while (current && !FUNCTION_TYPES.has(current.type)) {
            current = current.parent;
        }
        return current !== currentComponent;
    }

    /** Whether `node` sits where its value is aliased into its parent: a property read, a ternary branch, or an object or array. */
    function isAliasingParent(node) {
        const {parent} = node;
        switch (parent.type) {
            case 'MemberExpression':
                return parent.object === node;
            case 'Property':
                return parent.value === node && parent.parent.type === 'ObjectExpression';
            case 'ConditionalExpression':
                return parent.test !== node;
            case 'ArrayExpression':
            case 'LogicalExpression':
                return true;
            case 'SpreadElement':
                return parent.parent.type === 'ArrayExpression' || parent.parent.type === 'ObjectExpression';
            default:
                return WRAPPER_TYPES.has(parent.type);
        }
    }

    /** A use of `identifier` that React Compiler treats as a possible mutation: a call argument or a method call. */
    function isMutatingUse(identifier, depth = 0) {
        // A property read aliases the value, so `value.a.b` passed on or called is still a use of `value`.
        // Putting it in an object or array, or picking it in a ternary, aliases it too.
        let node = identifier;
        while (isAliasingParent(node)) {
            if (node.parent.type === 'MemberExpression' && node.parent.parent.type === 'CallExpression' && node.parent.parent.callee === node.parent) {
                return true;
            }
            node = node.parent.type === 'Property' ? node.parent.parent : node.parent;
        }
        const parent = node.parent;
        if ((parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.arguments.includes(node)) {
            return !(parent.type === 'CallExpression' && getHookName(parent));
        }
        if (parent.type === 'SpreadElement' && parent.parent.type === 'CallExpression' && parent.parent.arguments.includes(parent)) {
            return !getHookName(parent.parent);
        }
        // `const {a} = value` makes `a` an alias, so a call with `a` counts for `value` too.
        if (depth < 3 && parent.type === 'VariableDeclarator' && parent.init === node) {
            return sourceCode
                .getDeclaredVariables(parent)
                .some((alias) => alias.references.some((reference) => !reference.init && !isInsideNestedFunction(reference.identifier) && isMutatingUse(reference.identifier, depth + 1)));
        }
        return false;
    }

    /** React Compiler can't tell a call's result is a primitive, so any object, array or call result counts as mutable. */
    function isMutableValue(node) {
        const value = unwrap(node);
        if (!value) {
            return false;
        }
        if (value.type === 'ConditionalExpression') {
            return isMutableValue(value.consequent) || isMutableValue(value.alternate);
        }
        if (value.type === 'LogicalExpression') {
            return isMutableValue(value.left) || isMutableValue(value.right);
        }
        if (!MUTABLE_INIT_TYPES.has(value.type)) {
            return false;
        }
        return value.type !== 'CallExpression' || !getHookName(value);
    }

    function isMutableDeclaration(declarator) {
        return isMutableValue(declarator.init);
    }

    function getMutableVariables(statement) {
        if (statement.type !== 'VariableDeclaration') {
            return [];
        }
        return statement.declarations.filter(isMutableDeclaration).flatMap((declarator) => sourceCode.getDeclaredVariables(declarator));
    }

    /** Fills each entry's reads, writes (declarations included) and assignments from the component's scope. */
    function collectDependencies(functionNode, entries) {
        const scope = sourceCode.getScope(functionNode);
        const scopes = [scope, ...scope.childScopes.filter((child) => child.type === 'block')];
        for (const variableScope of scopes) {
            for (const variable of variableScope.variables) {
                for (const definition of variable.defs) {
                    const index = indexOfStatement(entries, definition.name);
                    if (index !== -1) {
                        entries[index].writes.add(variable);
                    }
                }
                for (const reference of variable.references) {
                    const index = indexOfStatement(entries, reference.identifier);
                    if (index === -1) {
                        continue;
                    }
                    if (reference.isRead()) {
                        entries[index].reads.add(variable);
                        if (isMutatingUse(reference.identifier) && !isInsideNestedFunction(reference.identifier)) {
                            entries[index].mutates.add(variable);
                        }
                    }
                    if (reference.isWrite() && !reference.init) {
                        entries[index].writes.add(variable);
                        entries[index].assigns.add(variable);
                    }
                }
            }
        }
    }

    function intersects(first, second) {
        for (const value of first) {
            if (second.has(value)) {
                return true;
            }
        }
        return false;
    }

    function canMoveAbove(entry, other) {
        return !intersects(entry.reads, other.writes) && !intersects(entry.assigns, other.reads) && !intersects(entry.assigns, other.writes);
    }

    /** Full lines of the statement plus the comments right above it, or undefined when they share a line with other code. */
    function getLineBlock(statement) {
        const comments = sourceCode.getCommentsBefore(statement);
        const previousToken = sourceCode.getTokenBefore(statement, {includeComments: false});
        const attached = comments.filter((comment) => !previousToken || comment.loc.start.line > previousToken.loc.end.line);
        const first = attached.at(0) ?? statement;
        const startLine = first.loc.start.line;
        const endLine = statement.loc.end.line;
        const nextToken = sourceCode.getTokenAfter(statement, {includeComments: true});
        if (nextToken && nextToken.loc.start.line === endLine) {
            return undefined;
        }
        if (sourceCode.lines[startLine - 1].slice(0, first.loc.start.column).trim() !== '') {
            return undefined;
        }
        // A blank line after the statement travels with it, so the gaps between sections stay where they were.
        const lastLine = sourceCode.lines[endLine]?.trim() === '' ? endLine + 1 : endLine;
        const start = sourceCode.getIndexFromLoc({line: startLine, column: 0});
        const end = lastLine < sourceCode.lines.length ? sourceCode.getIndexFromLoc({line: lastLine + 1, column: 0}) : sourceCode.text.length;
        return {start, end};
    }

    function buildFix(entries, index, targetIndex) {
        const entry = entries[index];
        const {statement} = entry;
        if (entry.hookName) {
            return undefined;
        }
        const isMovableDeclaration = statement.type === 'FunctionDeclaration' || (statement.type === 'VariableDeclaration' && statement.kind === 'const' && !hasAssignment(statement));
        if (!isMovableDeclaration) {
            return undefined;
        }
        // Effects only register callbacks and handlers only create functions, so nothing between them observes the move.
        const passed = entries.slice(targetIndex, index);
        const isPassingOnlyInertStatements = passed.every((other) => other.low === EFFECTS || (!other.hookName && other.low === HANDLERS));
        if (!isPassingOnlyInertStatements) {
            return undefined;
        }
        // A hook that captures a value freezes it, and React Compiler stops counting later calls with it as mutations.
        // Moving such a call above the hook would stretch the value's mutable range back over earlier hooks.
        // A handler captures what it reads, so for a handler every read counts.
        const capturedOrMutated = entry.low === HANDLERS ? entry.reads : entry.mutates;
        if (passed.some((other) => other.hookName && intersects(capturedOrMutated, other.reads))) {
            return undefined;
        }
        // Moving a mutable value above a hook would leave its later calls on the other side of that hook, which is the
        // split hookSplitsComputation reports. Above a handler, its range would overlap the handler's and React Compiler
        // would merge their memo blocks into one coarser block.
        if (getMutableVariables(statement).some((variable) => entries.some((other) => other !== entry && other.mutates.has(variable)))) {
            return undefined;
        }
        const moved = getLineBlock(statement);
        const target = getLineBlock(entries[targetIndex].statement);
        if (!moved || !target) {
            return undefined;
        }
        const text = sourceCode.text.slice(moved.start, moved.end);
        return (fixer) => [fixer.insertTextBeforeRange([target.start, target.start], text), fixer.removeRange([moved.start, moved.end])];
    }

    function reportOutOfOrder(entries) {
        for (let index = 1; index < entries.length; index++) {
            const entry = entries[index];
            let targetIndex = -1;
            for (let previous = index - 1; previous >= 0; previous--) {
                if (!canMoveAbove(entry, entries[previous])) {
                    break;
                }
                if (entries[previous].low > entry.high) {
                    targetIndex = previous;
                }
            }
            if (targetIndex === -1) {
                continue;
            }
            const target = entries[targetIndex];
            context.report({
                node: entry.statement,
                messageId: 'outOfOrder',
                data: {
                    section: entry.hookName ? `\`${entry.hookName}\` call` : SECTION_NAMES[entry.low].replace(/s$/, ''),
                    laterSection: target.hookName ? `\`${target.hookName}\` call` : SECTION_NAMES[target.low].replace(/s$/, ''),
                    line: target.statement.loc.start.line,
                },
                fix: buildFix(entries, index, targetIndex),
            });
        }
    }

    function reportSplitComputations(entries) {
        for (let index = 0; index < entries.length; index++) {
            const {statement} = entries[index];
            if (statement.type !== 'VariableDeclaration' || entries[index].hookName) {
                continue;
            }
            const nextHookIndex = entries.findIndex((other, otherIndex) => otherIndex > index && other.hookName);
            if (nextHookIndex === -1) {
                continue;
            }
            const hookEntry = entries[nextHookIndex];
            for (const declarator of statement.declarations) {
                if (!isMutableDeclaration(declarator)) {
                    continue;
                }
                for (const variable of sourceCode.getDeclaredVariables(declarator)) {
                    const splitReference = variable.references.find((reference) => {
                        const referenceIndex = indexOfStatement(entries, reference.identifier);
                        if (referenceIndex <= nextHookIndex || isInsideNestedFunction(reference.identifier) || !isMutatingUse(reference.identifier)) {
                            return false;
                        }
                        // A hook that captured the value earlier froze it, so this call can't extend its mutable range.
                        return !entries.slice(index + 1, referenceIndex).some((other) => other.hookName && other.reads.has(variable));
                    });
                    if (!splitReference) {
                        continue;
                    }
                    context.report({
                        node: splitReference.identifier,
                        messageId: 'hookSplitsComputation',
                        data: {variable: variable.name, hook: `\`${hookEntry.hookName}\``, hookLine: hookEntry.statement.loc.start.line},
                    });
                }
            }
        }
    }

    function checkComponent(node) {
        if (node.body.type !== 'BlockStatement') {
            return;
        }
        currentComponent = node;
        const componentName = getComponentName(node);
        if (!componentName || !COMPONENT_NAME_PATTERN.test(componentName)) {
            return;
        }
        const entries = [];
        for (const statement of node.body.body) {
            // Hooks can't follow an early return, so everything from the first return on is render.
            if (containsReturn(statement)) {
                break;
            }
            const category = classify(statement);
            if (category) {
                entries.push({statement, ...category, reads: new Set(), writes: new Set(), assigns: new Set(), mutates: new Set()});
            }
        }
        if (!entries.some((entry) => entry.hookName)) {
            return;
        }
        // Render goes last and spans the whole body, so a reference matches it only when no earlier statement holds it.
        entries.push({statement: node.body, low: RENDER, high: RENDER, reads: new Set(), writes: new Set(), assigns: new Set(), mutates: new Set()});
        collectDependencies(node, entries);
        reportOutOfOrder(entries);
        reportSplitComputations(entries);
    }

    return {
        FunctionDeclaration: checkComponent,
        FunctionExpression: checkComponent,
        ArrowFunctionExpression: checkComponent,
    };
}

export {name, meta, create};

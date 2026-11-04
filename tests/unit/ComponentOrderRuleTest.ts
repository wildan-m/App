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

const ruleModule: unknown = require('../../eslint-plugin-local-rules/component-order');

if (!isLocalRuleModule(ruleModule)) {
    throw new TypeError('Expected component-order to export an ESLint rule module.');
}

const ruleTester = new RuleTester({
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

describe('component-order', () => {
    ruleTester.run(ruleModule.name, ruleModule, {
        valid: [
            // Given a component already in the agreed order, nothing is reported.
            `function Example({reportID}) {
                const {translate} = useLocalize();
                const [report] = useOnyx(reportID);
                const [isExpanded, setIsExpanded] = useState(false);
                const title = getTitle(report, translate);
                function toggle() {
                    setIsExpanded((expanded) => !expanded);
                }
                useEffect(() => {
                    log(title);
                }, [title]);
                return <View title={title} onPress={toggle} />;
            }`,
            // Given a subscription keyed by a derived value, it has to stay after that value.
            `function Example({route}) {
                const reportID = getReportID(route);
                const [report] = useOnyx(reportID);
                return <View report={report} />;
            }`,
            // Given a custom hook the rule doesn't know, it may sit anywhere among the hooks.
            `function Example() {
                const [value, setValue] = useState(0);
                const results = useSearchResults();
                return <View results={results} value={value} />;
            }`,
            // Given a derived value after an early return, it belongs to render and is not reported.
            `function Example({report}) {
                useEffect(() => {}, []);
                if (!report) {
                    return null;
                }
                const title = getTitle(report);
                return <View title={title} />;
            }`,
            // Given a value only read by JSX or a closure after a hook, React Compiler still caches it.
            `function Example({items}) {
                const list = items.filter(isVisible);
                useEffect(() => {
                    save(list);
                }, [list]);
                return <View data={list} />;
            }`,
            // Given a plain function that isn't a component, nothing is checked.
            `function getExample() {
                useEffect(() => {}, []);
                const title = getTitle();
                return title;
            }`,
        ],
        invalid: [
            {
                // Given a derived value after an effect, it is moved above the effect.
                code: `function Example({items}) {
    const [isExpanded] = useState(false);
    useEffect(() => {}, []);
    // The visible rows.
    const rows = items.filter(isVisible);
    return <View data={rows} expanded={isExpanded} />;
}`,
                output: `function Example({items}) {
    const [isExpanded] = useState(false);
    // The visible rows.
    const rows = items.filter(isVisible);
    useEffect(() => {}, []);
    return <View data={rows} expanded={isExpanded} />;
}`,
                errors: [{messageId: 'outOfOrder'}],
            },
            {
                // Given a handler declared after an effect, it is moved above the effect.
                code: `function Example() {
    useEffect(() => {}, []);
    function handlePress() {}
    return <View onPress={handlePress} />;
}`,
                output: `function Example() {
    function handlePress() {}
    useEffect(() => {}, []);
    return <View onPress={handlePress} />;
}`,
                errors: [{messageId: 'outOfOrder'}],
            },
            {
                // Given a hook out of order, it is reported but never moved, so hook order never changes.
                code: `function Example() {
    const [value] = useState(0);
    const {translate} = useLocalize();
    return <View value={value} label={translate('common.save')} />;
}`,
                output: null,
                errors: [{messageId: 'outOfOrder'}],
            },
            {
                // Given an effect that captures `roles`, React Compiler freezes `roles` there, so the later method call is no
                // mutation. Moving that call above the effect would stretch `roles` back over `useRef` and drop its cache,
                // so the order is reported without a fix and the call is not reported as splitting a computation.
                code: `function Example({translate}) {
    const roles = getRoles(translate);
    const ref = useRef(null);
    useEffect(() => {
        apply(roles);
    }, [roles]);
    const required = roles.filter(isRequired);
    return <View roles={required} ref={ref} />;
}`,
                output: null,
                errors: [{messageId: 'outOfOrder'}, {messageId: 'outOfOrder'}],
            },
            {
                // Given a value created before a hook and passed to a call after it, React Compiler drops its memo block.
                code: `function Example({items}) {
    const list = items.filter(isVisible);
    const [value] = useState(0);
    return <View value={value} />;
    }
const Other = ({items}) => {
    const list = items.filter(isVisible);
    useEffect(() => {}, []);
    const total = list.map(getAmount);
    return <View total={total} />;
};`,
                output: `function Example({items}) {
    const list = items.filter(isVisible);
    const [value] = useState(0);
    return <View value={value} />;
    }
const Other = ({items}) => {
    const list = items.filter(isVisible);
    const total = list.map(getAmount);
    useEffect(() => {}, []);
    return <View total={total} />;
};`,
                errors: [{messageId: 'outOfOrder'}, {messageId: 'outOfOrder'}, {messageId: 'hookSplitsComputation'}],
            },
        ],
    });
});

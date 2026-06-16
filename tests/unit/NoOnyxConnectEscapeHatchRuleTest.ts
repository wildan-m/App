type Report = {
    messageId?: string;
};

type Comment = {
    value: string;
    loc: {
        start: {line: number; column: number};
        end: {line: number; column: number};
    };
};

type RuleContext = {
    getFilename: () => string;
    getSourceCode: () => {
        getAllComments: () => Comment[];
    };
    report: (report: Report) => void;
};

type RuleModule = {
    create: (context: RuleContext) => {
        Program?: () => void;
    };
};

const rule = require('../../eslint-plugin-local-rules/no-onyx-connect-escape-hatch') as RuleModule;

function createComment(value: string): Comment {
    return {
        value,
        loc: {
            start: {line: 1, column: 0},
            end: {line: 1, column: value.length},
        },
    };
}

function runRule(commentValues: string[], filename = 'src/libs/SomeUtils.ts') {
    const reports: Report[] = [];
    const visitor = rule.create({
        getFilename: () => filename,
        getSourceCode: () => ({
            getAllComments: () => commentValues.map(createComment),
        }),
        report: (report: Report) => reports.push(report),
    });

    visitor.Program?.();

    return reports;
}

describe('no-onyx-connect-escape-hatch', () => {
    it('flags eslint-disable-next-line targeting rulesdir/no-onyx-connect', () => {
        const reports = runRule([' eslint-disable-next-line rulesdir/no-onyx-connect -- pure utility ']);

        expect(reports).toHaveLength(1);
        expect(reports.at(0)?.messageId).toBe('noEscapeHatch');
    });

    it('flags eslint-disable-line targeting the rule without the rulesdir/ prefix', () => {
        const reports = runRule([' eslint-disable-line no-onyx-connect ']);

        expect(reports).toHaveLength(1);
        expect(reports.at(0)?.messageId).toBe('noEscapeHatch');
    });

    it('flags a block eslint-disable targeting the rule', () => {
        const reports = runRule([' eslint-disable rulesdir/no-onyx-connect ']);

        expect(reports).toHaveLength(1);
        expect(reports.at(0)?.messageId).toBe('noEscapeHatch');
    });

    it('cannot itself be silenced: flags a disable targeting no-onyx-connect-escape-hatch', () => {
        const reports = runRule([' eslint-disable-next-line rulesdir/no-onyx-connect-escape-hatch ']);

        expect(reports).toHaveLength(1);
        expect(reports.at(0)?.messageId).toBe('noEscapeHatch');
    });

    it('ignores disable directives for unrelated rules', () => {
        const reports = runRule([' eslint-disable-next-line no-console ']);

        expect(reports).toHaveLength(0);
    });

    it('ignores ordinary comments that merely mention Onyx.connect', () => {
        const reports = runRule([' allPersonalDetails is read via Onyx.connect for legacy reasons ']);

        expect(reports).toHaveLength(0);
    });

    it('skips test files, matching the underlying no-onyx-connect rule scope', () => {
        const reports = runRule([' eslint-disable-next-line rulesdir/no-onyx-connect '], '/Users/dev/App/tests/unit/SomethingTest.ts');

        expect(reports).toHaveLength(0);
    });
});

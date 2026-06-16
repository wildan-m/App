const name = 'no-onyx-connect-escape-hatch';

// Matches an eslint-disable / eslint-disable-next-line / eslint-disable-line directive that
// targets the `no-onyx-connect` ban (with or without the `rulesdir/` prefix). The trailing
// word boundary also catches `no-onyx-connect-escape-hatch`, so this rule can't be silenced either.
const DISABLE_TARGETING_NO_ONYX_CONNECT = /eslint-disable(?:-next-line|-line)?[\s\S]*?(?:rulesdir\/)?no-onyx-connect\b/;

const meta = {
    type: 'problem',
    docs: {
        description:
            'Forbid silencing the no-onyx-connect ban with an eslint-disable directive, so new Onyx.connect() calls have no escape hatch and must be migrated to the useOnyx() hook.',
        recommended: 'error',
    },
    schema: [],
    messages: {
        noEscapeHatch: 'The no-onyx-connect ban has no escape hatch and cannot be disabled. Use the useOnyx() hook instead of Onyx.connect().',
    },
};

function create(context) {
    const sourceCode = context.getSourceCode();
    const filename = typeof context.getFilename === 'function' ? context.getFilename() : '';

    // Match the underlying no-onyx-connect rule's scope: Onyx.connect() is allowed in test
    // files, so a disable directive there is out of scope and should not be flagged.
    if (filename.includes('/tests/')) {
        return {};
    }

    return {
        Program() {
            for (const comment of sourceCode.getAllComments()) {
                if (!DISABLE_TARGETING_NO_ONYX_CONNECT.test(comment.value)) {
                    continue;
                }
                context.report({loc: comment.loc, messageId: 'noEscapeHatch'});
            }
        },
    };
}

export {name, meta, create};

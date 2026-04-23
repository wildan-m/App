# Linting

The App is linted with [ESLint](https://eslint.org) and its configuration lives in [`config/eslint/`](../config/eslint/). The single source of truth is [`config/eslint/eslint.config.mjs`](../config/eslint/eslint.config.mjs) — every other file in that directory (plugins, processors, the seatbelt baseline) is wired up from there. A one-line shim at the repo root ([`eslint.config.mjs`](../eslint.config.mjs)) re-exports it so ESLint's flat-config autodiscovery (used by `npx eslint`, the VS Code / Cursor ESLint extension, JetBrains, etc.) finds it without any configuration.

## TL;DR

```bash
# Lint the whole repo (same command CI runs):
npm run lint

# Continuously re-lint changed files as you edit:
npm run lint-watch

# Lint just the files you're working on:
npx eslint <files>
```

Every rule is configured as `error`. If `npm run lint` exits non-zero locally, CI will fail too — fix the reported errors before opening a PR.

## Mental model

1. **Every rule is an error.** There is no `warning` tier. If ESLint reports an issue, it's something we expect to be fixed.
2. **Pre-existing errors are grandfathered in via [`eslint-seatbelt`](https://github.com/justjake/eslint-seatbelt).** A per-file / per-rule baseline lives at [`config/eslint/eslint.seatbelt.tsv`](../config/eslint/eslint.seatbelt.tsv). As long as a file's error count for a given rule is **≤** its recorded baseline, seatbelt reclassifies those errors as warnings and the run still passes.
3. **The baseline is a ratchet.** The count can only go down over time — never up — unless you (and a reviewer) explicitly allow an increase.
4. **You never hand-edit `eslint.seatbelt.tsv`.** Seatbelt rewrites it deterministically based on what it sees during a lint run.

## Day-to-day workflows

### "I just wrote some code — is it clean?"

```bash
npx eslint <changed files>
```

If this exits 0, you're good. If it reports errors:

- **Real error in code you just wrote** → fix it.
- **Pre-existing error in a file you touched** → see the next section.

### "I fixed an existing baselined error"

Just run `npm run lint` (or `npx eslint <file>`) locally. Seatbelt notices the count went down, rewrites `config/eslint/eslint.seatbelt.tsv` to reflect the lower count, and prints something like:

```
[eslint-seatbelt]: File src/foo.ts has 2 errors of rule @typescript-eslint/no-deprecated, but the seatbelt file allows 3. Decreasing the allowed error count to 2.
```

Commit the updated `eslint.seatbelt.tsv` alongside your fix. CI will later verify the count really did drop (see [CI behavior](#ci-behavior)).

### "I added a new error and can't easily fix it right now"

The default assumption is that you fix it. If you genuinely need to land code that trips a baselined rule and the fix is out of scope, you have two options, in order of preference:

1. **Suppress the specific occurrence** with an `eslint-disable-next-line <rule>` comment and a justification. See [`CONSISTENCY-5`](../.claude/skills/coding-standards/rules/consistency-5-justify-eslint-disable.md).
2. **Widen the seatbelt baseline** for that file/rule with `SEATBELT_INCREASE`:

    ```bash
    # Allow the new count for one rule:
    SEATBELT_INCREASE=@typescript-eslint/no-deprecated npm run lint

    # Or for every rule (sledgehammer — use only for first-time rule rollouts):
    SEATBELT_INCREASE=ALL npm run lint
    ```

   Both variants rewrite `config/eslint/eslint.seatbelt.tsv`. **Always commit the diff alongside your code**, and expect a reviewer to ask you why a fix wasn't feasible.

### "I'm enabling a new rule repo-wide"

1. Add the rule to `config/eslint/eslint.config.mjs` in `'error'` mode.
2. Bake the initial baseline:

    ```bash
    SEATBELT_INCREASE=<rule-id> npm run lint
    ```

3. Commit the config change and the new lines in `config/eslint/eslint.seatbelt.tsv` together.

## CI behavior

The [`ESLint check`](../.github/workflows/lint.yml) workflow runs `npm run lint` with `CI=1` set. Under `CI=1`, seatbelt switches to **frozen mode**:

- If your branch's counts are lower than what's committed in `eslint.seatbelt.tsv`, CI fails and asks you to commit the updated baseline.
- If your branch's counts are higher, CI fails and reports the new errors.

In short: **commit whatever `eslint.seatbelt.tsv` diff your local `npm run lint` produced, or CI will complain.**

## Escape hatches

Set any of these env vars for a one-off local run when you need to bypass seatbelt's usual behavior:

| Variable                  | Effect                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `SEATBELT_INCREASE=<rule>`| Allow the baseline to grow for `<rule>` (or `ALL`). Writes the new count to disk.        |
| `SEATBELT_FROZEN=1`       | Force frozen mode locally (what CI does). Useful for reproducing CI failures.            |
| `SEATBELT_DISABLE=1`      | Skip all seatbelt processing for this run — raw ESLint output, baseline file ignored.    |
| `SEATBELT_VERBOSE=1`      | Log every decrement/increment seatbelt performs. Handy when debugging the baseline.      |

Full reference: [eslint-seatbelt README](https://github.com/justjake/eslint-seatbelt#configuration).

## How the config is wired

[`config/eslint/eslint.config.mjs`](../config/eslint/eslint.config.mjs) is a standard ESLint v9 flat config. Notable local pieces:

- **`config/eslint/plugins/eslint-plugin-report-name-utils.mjs`** — tiny in-house plugin that enforces the `computeReportName` import boundary.
- **`config/eslint/processors/eslint-processor-react-compiler-compat.mjs`** — suppresses `react-hooks/*` / `react-you-might-not-need-an-effect/*` rules on files that compile cleanly with React Compiler (which already enforces a superset of those rules at build time). See [REACT_COMPILER.md](./REACT_COMPILER.md).
- **`config/eslint/processors/eslint-processor-expensify.mjs`** — stitches the React Compiler compat processor and the `eslint-seatbelt` processor together so a single `processor:` entry in the config covers both.

There is also a patch on top of `eslint-seatbelt` at `patches/eslint-seatbelt/` that makes its file writes thread-safe under ESLint's `--concurrency=auto`. See [`patches/eslint-seatbelt/details.md`](../patches/eslint-seatbelt/details.md). Nothing you need to think about day to day; it "just works".

## Related reading

- [`CONSISTENCY-5`: Justify ESLint rule disables](../.claude/skills/coding-standards/rules/consistency-5-justify-eslint-disable.md) — when `eslint-disable` is acceptable, and how to document it.
- [`CLEAN-REACT-PATTERNS-0`: React Compiler compliance](../.claude/skills/coding-standards/rules/clean-react-0-compiler.md) — why some hook-related rules are suppressed per-file.
- [`STYLE.md`](./STYLE.md) — the coding style rules many of our ESLint rules enforce.
- [`REACT_COMPILER.md`](./REACT_COMPILER.md) — separate compiler-compliance CI check that runs alongside lint.

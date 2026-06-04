---
ruleId: CONSISTENCY-11
title: Document functions with JSDocs
---

## [CONSISTENCY-11] Document functions with JSDocs

### Reasoning

Functions that take parameters or return a value should carry JSDocs following the project `STYLE.md` guidelines. JSDocs give editors type/usage hints, document the intent of arguments and the meaning of the return value, and make non-obvious helpers understandable without reading the implementation. This is especially valuable for shared utilities consumed across the app.

### Incorrect

```ts
function getDisplayName(account, fallback) {
  return account?.displayName || fallback;
}
```

### Correct

```ts
/**
 * Returns the account's display name, or the provided fallback when it is missing.
 * @param account - the account whose display name to read
 * @param fallback - value to return when the account has no display name
 * @returns the resolved display name
 */
function getDisplayName(account: Account, fallback: string): string {
  return account?.displayName || fallback;
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- A newly added function/method has at least one parameter or a non-void return value.
- It has no JSDoc comment block.
- The function is non-trivial — its parameters or return value are not fully self-evident from the name and signature.

**DO NOT flag if:**

- The function is a trivial one-liner whose behavior is obvious from its name and typed signature.
- It is an inline arrow/event handler passed directly as a prop or callback.
- It is a React component (documented by its props type, not function JSDocs) or a test helper.

**Search Patterns** (hints for reviewers):
- Added `function name(...)` / `const name = (...) =>` declarations with parameters or a return value and no preceding `/** ... */` block.

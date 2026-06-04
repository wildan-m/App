---
ruleId: CONSISTENCY-12
title: Add a header description to new non-trivial files
---

## [CONSISTENCY-12] Add a header description to new non-trivial files

### Reasoning

A new file whose purpose is not self-evident should open with a short comment describing what it does and/or why it is needed. A one- or two-line header orients the next reader immediately, explains why the module exists, and prevents "mystery files" whose role can only be reconstructed by reading every line. Trivial, self-explanatory files do not need one.

### Incorrect

```ts
// src/libs/SuffixUkkonenTree.ts  (new file, no explanation)
export function buildTree(words: string[]) {
  // ...non-obvious algorithm...
}
```

### Correct

```ts
/**
 * Suffix (Ukkonen) tree used to power fast substring search over the
 * options list. Built once and queried per keystroke to avoid O(n*m) scans.
 */
export function buildTree(words: string[]) {
  // ...non-obvious algorithm...
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- The PR adds a brand-new source file under `src/` (or another application directory).
- The file's purpose is not obvious from its name alone — it contains non-trivial logic, an algorithm, or a non-obvious responsibility.
- The file has no top-of-file comment describing what it does or why it exists.

**DO NOT flag if:**

- The file is self-explanatory (e.g. a small typed constants file, a thin re-export, a component whose name fully conveys its purpose).
- A header description is already present at the top of the file.
- It is a test file, a generated file, or a config file with a conventional well-known role.

**Search Patterns** (hints for reviewers):
- Newly added files (status `A` in the diff) whose first non-import line is code, with no leading `/** ... */` or `//` description.

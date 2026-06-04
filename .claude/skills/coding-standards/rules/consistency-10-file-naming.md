---
ruleId: CONSISTENCY-10
title: Name non-platform files after their export
---

## [CONSISTENCY-10] Name non-platform files after their export

### Reasoning

Non-platform-specific files must be named after what they export, not `index.ts`/`index.js`. Generic `index` files make navigation, search, and stack traces ambiguous — many unrelated `index.ts` tabs are indistinguishable. Naming the file after its default export (`Avatar.tsx`, `useReportActions.ts`) makes the codebase searchable and self-describing. Platform-specific files are named for the platform they support (`index.native.ts`, `index.ios.ts`) per the README.

### Incorrect

```
src/components/Avatar/index.tsx   // exports the Avatar component
```

### Correct

```
src/components/Avatar/Avatar.tsx  // exports the Avatar component
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- A newly added or renamed file is named `index.ts`/`index.tsx`/`index.js`/`index.jsx`.
- The file is NOT platform-specific (no `.native`/`.ios`/`.android`/`.web`/`.desktop` suffix).
- The file has a clear primary export it could be named after.

**DO NOT flag if:**

- The file is platform-specific (`index.native.ts`, `index.ios.ts`, etc.) — these are intentionally named per the platform README convention.
- The file is a barrel/re-export `index` that only aggregates a directory's public exports.
- It is config or tooling that conventionally lives as `index` (and is not application source under `src/`).

**Search Patterns** (hints for reviewers):
- Newly added paths ending in `/index.ts`, `/index.tsx`, `/index.js` without a platform suffix.

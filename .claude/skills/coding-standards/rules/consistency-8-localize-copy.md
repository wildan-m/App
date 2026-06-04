---
ruleId: CONSISTENCY-8
title: Localize user-visible copy
---

## [CONSISTENCY-8] Localize user-visible copy

### Reasoning

Any text shown to the user must be added to the language files under `src/languages/*` and rendered through the translation method, never hardcoded as a literal in JSX. Hardcoded copy cannot be translated, bypasses review of wording, and drifts out of sync across locales. Routing every string through the translation layer keeps the product fully localizable.

### Incorrect

```tsx
function EmptyState() {
  return <Text>No expenses to show</Text>;
}
```

### Correct

```tsx
function EmptyState() {
  const {translate} = useLocalize();
  return <Text>{translate('common.noExpensesToShow')}</Text>;
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- A new or modified user-visible string literal is rendered directly (inside `<Text>`, as a `label`/`title`/`placeholder`/`text` prop, in an alert/toast, etc.).
- The string is real user-facing copy, not an identifier, key, test ID, or developer-only value.
- The string is not already produced by `translate(...)` / a `src/languages/*` entry.

**DO NOT flag if:**

- The text already comes from the translation method or a language-file key.
- The literal is a `testID`, accessibility role, style token, route name, icon name, or other non-display value.
- The value is dynamic user data (e.g. a report name) rather than static product copy.

**Search Patterns** (hints for reviewers):
- String literals inside `<Text>...</Text>` or in `label=`/`title=`/`placeholder=`/`text=` props that are not wrapped in `translate(`.

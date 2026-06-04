---
ruleId: CONSISTENCY-9
title: Localize numbers, amounts, dates, and phone numbers
---

## [CONSISTENCY-9] Localize numbers, amounts, dates, and phone numbers

### Reasoning

Numbers, currency amounts, dates, and phone numbers shown in the product must be formatted through the localization helpers rather than with ad-hoc string building. Locales differ in decimal/thousands separators, currency placement, date order, and phone formatting; hand-formatting these values produces output that is wrong for many users. Using the shared localization methods guarantees correct, consistent formatting everywhere.

### Incorrect

```tsx
function ExpenseAmount({amount, currency}: ExpenseAmountProps) {
  return <Text>{`${currency} ${amount.toFixed(2)}`}</Text>;
}
```

### Correct

```tsx
function ExpenseAmount({amount, currency}: ExpenseAmountProps) {
  const {convertToDisplayString} = useLocalize();
  return <Text>{convertToDisplayString(amount, currency)}</Text>;
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- A new or modified amount, number, date, or phone number is rendered to the user.
- It is formatted manually (`toFixed`, string concatenation of currency/number, manual date assembly, raw `Date` methods) instead of via the localization methods.
- The value is actually displayed, not used purely for internal logic.

**DO NOT flag if:**

- The value already goes through the localization/number/date helpers (e.g. `convertToDisplayString`, the locale date utilities).
- The number is non-display (an index, a pixel size, an internal id/count used only in logic).
- A shared util already handles the locale-aware formatting for this value.

**Search Patterns** (hints for reviewers):
- `.toFixed(`, `.toLocaleString(` outside the locale utils, manual `${currency}`/`${symbol}` concatenation, raw `new Date(...).get*()` used directly in rendered output.

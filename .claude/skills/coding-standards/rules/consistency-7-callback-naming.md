---
ruleId: CONSISTENCY-7
title: Name callbacks for what they do, not the event
---

## [CONSISTENCY-7] Name callbacks for what they do, not the event

### Reasoning

A callback method should be named for the action it performs, not for the event that triggers it. Naming a handler `onIconClick` couples the name to the UI event and tells the reader nothing about what happens; naming it `toggleReport` documents the behavior and survives being wired to a different event later. This keeps handler names meaningful and reusable.

### Incorrect

```tsx
function ReportRow() {
  const onIconClick = () => {
    toggleReportPinned(report.reportID);
  };

  return <PressableWithFeedback onPress={onIconClick} />;
}
```

### Correct

```tsx
function ReportRow() {
  const toggleReport = () => {
    toggleReportPinned(report.reportID);
  };

  return <PressableWithFeedback onPress={toggleReport} />;
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- A newly added or modified function is passed to a component event-handler prop (e.g. `onPress`, `onChange`, `onSelect`).
- The function is named after the triggering event (`onClick`, `onIconClick`, `onPressButton`, `handleClick`, etc.) rather than the action it performs.
- A clearer action-based name is reasonably available from what the function body does.

**DO NOT flag if:**

- The name already describes the action (e.g. `toggleReport`, `submitForm`, `dismissModal`).
- The function is a prop declaration on the component's own API (a component legitimately exposes an `onPress` prop for its parent to pass in).
- The handler genuinely only forwards/relays an event with no domain meaning to capture.

**Search Patterns** (hints for reviewers):
- `const on[A-Z]\w* =` / `const handle[A-Z]\w* =` assigned to a function and passed to `onPress`/`onChange`/`onSelect`/`onClick`.

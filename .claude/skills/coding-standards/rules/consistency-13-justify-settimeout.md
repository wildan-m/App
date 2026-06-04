---
ruleId: CONSISTENCY-13
title: Justify new setTimeout calls
---

## [CONSISTENCY-13] Justify new setTimeout calls

### Reasoning

A new `setTimeout` is usually a workaround for a timing or ordering problem, and an unexplained delay is fragile: the chosen duration is arbitrary, it can race on slower devices, and the next reader cannot tell whether it is safe to remove. Every new `setTimeout` should be accompanied by a comment explaining why the delay is needed (or replaced with a deterministic mechanism such as a layout/interaction callback). This keeps timing hacks visible and reviewable.

### Incorrect

```ts
function focusInput() {
  setTimeout(() => {
    inputRef.current?.focus();
  }, 100);
}
```

### Correct

```ts
function focusInput() {
  // Focus must wait until the modal's enter transition finishes, otherwise
  // the input is unmounted when focus() runs. InteractionManager fires after
  // the animation rather than relying on an arbitrary delay.
  InteractionManager.runAfterInteractions(() => {
    inputRef.current?.focus();
  });
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- The PR adds a new `setTimeout(...)` call.
- There is no adjacent comment explaining why the delay is required.
- A deterministic alternative (interaction/layout callback, promise, event) was not used and no justification is given for the timer.

**DO NOT flag if:**

- The `setTimeout` has a clear comment explaining the reason for the delay.
- It implements an intentional, self-evident debounce/throttle/poll with a named, documented interval constant.
- It is in test code simulating elapsed time.

**Search Patterns** (hints for reviewers):
- Added `setTimeout(` calls with no explanatory comment on or directly above the line.

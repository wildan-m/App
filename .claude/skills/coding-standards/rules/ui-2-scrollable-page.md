---
ruleId: UI-2
title: Make new pages scrollable with ScrollView
---

## [UI-2] Make new pages scrollable with ScrollView

### Reasoning

A new page should wrap its content in a `ScrollView` (or an equivalent scrollable container such as `ScrollViewWithContext`) so the page remains usable as more elements are added or on smaller screens and larger font sizes. A fixed, non-scrolling page silently clips content that overflows the viewport, leaving buttons and fields unreachable. Making pages scrollable by default avoids those layout traps.

### Incorrect

```tsx
function NewSettingsPage() {
  return (
    <ScreenWrapper testID={NewSettingsPage.displayName}>
      <HeaderWithBackButton title={translate('settings.title')} />
      <View>
        {/* many rows that can overflow the screen */}
      </View>
    </ScreenWrapper>
  );
}
```

### Correct

```tsx
function NewSettingsPage() {
  return (
    <ScreenWrapper testID={NewSettingsPage.displayName}>
      <HeaderWithBackButton title={translate('settings.title')} />
      <ScrollView>
        {/* same rows, now scrollable when they overflow */}
      </ScrollView>
    </ScreenWrapper>
  );
}
```

---

### Review Metadata

Flag ONLY when ALL of these are true:

- The PR adds a new full page/screen component (e.g. a new `*Page` rendered by the navigator).
- Its body renders stacked content that can grow (form fields, lists of rows, settings items).
- The content is placed in a non-scrolling container (a plain `View`) rather than a `ScrollView`/scrollable list.

**DO NOT flag if:**

- The page already uses `ScrollView`, `ScrollViewWithContext`, or a virtualized list (`FlatList`/`SectionList`/`SelectionList`) that scrolls.
- The page is intentionally a single fixed-height/full-screen layout (e.g. a centered confirmation, a full-screen image/video, a map) where scrolling does not apply.
- It is a modal/RHP step that delegates scrolling to a shared wrapper.

**Search Patterns** (hints for reviewers):
- New `*Page.tsx` components whose top-level content container is a `<View>` wrapping multiple stacked children, with no `ScrollView`/list component.

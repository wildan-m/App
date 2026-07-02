# `@sentry/react-native` patches

### [@sentry+react-native+8.2.0.patch](@sentry+react-native+8.2.0.patch)

- Reason: Two independent fixes bundled in one patch for this package version:
  1. **`scripts/sentry_utils.rb`** — Fixes React Native path resolution in the Sentry Ruby script during iOS builds. The original implementation failed to locate `react-native/package.json` in our hybrid app setup. The patch changes the resolution strategy to first try resolving from the installation root (similar to react-native-svg and react-native-reanimated), and falls back to ENV variables with support for both node_modules conventions.
  2. **`ios/RNSentryTimeToDisplay.m`** — Fixes an intermittent `EXC_BAD_ACCESS` iOS crash in the SDK's time-to-display tracking. The shared mutable statics (`activeSpanId`, `screenIdToRenderDuration`, `screenIdAge`, `screenIdCurrentIndex`) were read on the frames-tracker display-link thread while being written by `setActiveSpanId:` on the JS thread (exported synchronously), with no synchronization. A concurrent write could deallocate the `activeSpanId` string mid-`stringByAppendingString:`, causing a use-after-free. The patch serializes every accessor with `@synchronized([RNSentryTimeToDisplay class])` (recursive, so the nested `putTimeToDisplayFor:` call re-enters safely) and captures `activeSpanId` into a local strong reference in the read path so ARC keeps it alive across the append.
- Upstream PR/issue: (1) N/A (specific to our hybrid app environment); (2) to be filed at getsentry/sentry-react-native
- E/App issue: (2) https://github.com/Expensify/App/issues/95197
- PR Introducing Patch: (1) https://github.com/Expensify/App/pull/70298


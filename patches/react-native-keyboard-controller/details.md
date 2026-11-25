# `react-native-keyboard-controller` patches

### [react-native-keyboard-controller+1.22.4+001+fix-insets-in-landscape.patch](react-native-keyboard-controller+1.22.4+001+fix-insets-in-landscape.patch)

- Reason:
  
    ```
    In EdgeToEdgeReactViewGroup.setupWindowInsets(), the library unconditionally applies navBarInsets.left and navBarInsets.right as margins on the content view, even though the bottom margin is already conditional on navigationBarTranslucent. In landscape mode on Android, the navigation bar moves to the side of the screen, and these unconditional margins shrink the content area by the nav bar width. This causes useSafeAreaFrame() to report a reduced windowWidth and useSafeAreaInsets() to return 0 for left/right insets, since the SafeAreaProvider view no longer overlaps with the nav bar area. The patch makes left/right margins respect the same shouldApplyZeroPaddingBottom condition used for the bottom margin.
    ```
  
- Upstream PR/issue: -
- E/App issue: https://github.com/Expensify/App/issues/87307
- PR introducing patch: https://github.com/Expensify/App/pull/87376

### [react-native-keyboard-controller+1.22.4+002+backport-upstream-keyboard-state-sync.patch](react-native-keyboard-controller+1.22.4+002+backport-upstream-keyboard-state-sync.patch)

- Reason:
  
    ```
    KeyboardAvoidingView sets its starting keyboard state when its keyboard handlers are attached: on mount, and again when a frozen screen, such as a chat covered by another screen, becomes visible. Without that sync, a chat opened with a draft keeps "keyboard closed, height 0" while the keyboard is already open, so the composer stays behind the keyboard, and a chat that froze while the keyboard was closing keeps the old keyboard padding, leaving a blank gap below the composer. This patch is a backport of the upstream fix for both problems: useGenericKeyboardHandler gains an onSync callback that is invoked on the UI thread with the keyboard's current state whenever the handlers are attached, and KeyboardAvoidingView initializes its shared values from that callback. Reading the current state inside the worklet on the UI thread means the sync cannot overwrite newer values written by keyboard events that arrive in between, such as when an input has autoFocus. Remove this patch once we upgrade to a release that contains the upstream fix.
    ```
  
- Upstream PR/issue: https://github.com/kirillzyusko/react-native-keyboard-controller/pull/1802
- E/App issue: https://github.com/Expensify/App/issues/106859, https://github.com/Expensify/App/issues/108029
- PR introducing patch: https://github.com/Expensify/App/pull/106003 (original patch), https://github.com/Expensify/App/pull/106992 (updated), backport per issue 108029

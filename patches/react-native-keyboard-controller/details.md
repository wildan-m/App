# `react-native-keyboard-controller` patches

### [react-native-keyboard-controller+1.22.4+001+fix-insets-in-landscape.patch](react-native-keyboard-controller+1.22.4+001+fix-insets-in-landscape.patch)

- Reason:
  
    ```
    In EdgeToEdgeReactViewGroup.setupWindowInsets(), the library unconditionally applies navBarInsets.left and navBarInsets.right as margins on the content view, even though the bottom margin is already conditional on navigationBarTranslucent. In landscape mode on Android, the navigation bar moves to the side of the screen, and these unconditional margins shrink the content area by the nav bar width. This causes useSafeAreaFrame() to report a reduced windowWidth and useSafeAreaInsets() to return 0 for left/right insets, since the SafeAreaProvider view no longer overlaps with the nav bar area. The patch makes left/right margins respect the same shouldApplyZeroPaddingBottom condition used for the bottom margin.
    ```
  
- Upstream PR/issue: -
- E/App issue: https://github.com/Expensify/App/issues/87307
- PR introducing patch: https://github.com/Expensify/App/pull/87376

### [react-native-keyboard-controller+1.22.4+002+ios26-born-finished-keyboard-animation.patch](react-native-keyboard-controller+1.22.4+002+ios26-born-finished-keyboard-animation.patch)

- Reason:
  
    ```
    On iOS 26 the library emits per-frame onKeyboardMove events from a display-link watcher, and the watcher returns early for the whole keyboard flight when the extracted KeyboardAnimation reports isFinished. The animation is created in keyboardWillShow/keyboardWillHide with fromValue = prevKeyboardPosition, and KeyboardAnimation initializes lastValue to fromValue while isFinished compares lastValue == toValue. Whenever prevKeyboardPosition is left stale at the destination height (the keyboardDidHide reset never ran because the pending "did" task was cancelled by a new show, or the keyboardLayoutGuide did not animate back after a native-stack pop), the new animation is born finished and every per-frame event is silently swallowed; onKeyboardMoveStart/End still fire, so UI that follows the keyboard (e.g. the report composer) stays put during the smooth system animation and jumps to the final position afterwards. The patch makes initializeAnimation per-flight: it clears the previous flight's animation object and skips extraction when fromValue equals toValue, so the watcher falls back to emitting the directly measured keyboardLayoutGuide position every frame.
    ```
  
- Upstream PR/issue: https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1591
- E/App issue: https://github.com/Expensify/App/issues/105683
- PR introducing patch: -
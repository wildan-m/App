# `expo-video` patches

### [expo-video+55.0.3+001+catch_play_abort_error.patch](expo-video+55.0.3+001+catch_play_abort_error.patch)

- Reason: When rapidly seeking a video via the progress bar on web, `HTMLVideoElement.play()` returns a Promise that gets rejected with `AbortError` if `pause()` is called before it resolves. This patch wraps all 5 `video.play()` call sites in `VideoPlayer.web.js` with `.catch()` to silently swallow `AbortError` while re-throwing any other errors. This is the [standard fix recommended by Chrome](https://developer.chrome.com/blog/play-request-was-interrupted).

### [expo-video+55.0.3+002+guard_uninitialized_videoViewId_on_finish.patch](expo-video+55.0.3+002+guard_uninitialized_videoViewId_on_finish.patch)

- Reason: On Android, `FullscreenPlayerActivity` can be recreated by the system without the player key in its intent (e.g. after the app process is killed in the background and the task is restored). In that case `onCreate` throws `FullScreenVideoViewNotFoundException` before the `videoViewId` `lateinit var` is ever assigned, and its `catch` block calls `finish()`. The overridden `finish()` unconditionally reads `videoViewId` (`VideoManager.getVideoView(videoViewId).attachPlayer()`), which throws `UninitializedPropertyAccessException` and crashes the app. This patch guards the re-attach call with `if (::videoViewId.isInitialized)` so a half-initialized activity closes cleanly instead of crashing. The normal path is unchanged because `videoViewId` is always initialized once `onCreate` completes.

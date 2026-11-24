# `react-dom` patches

### [react-dom+19.2.3+001+fire-onselect-after-mouseup-outside-root.patch](react-dom+19.2.3+001+fire-onselect-after-mouseup-outside-root.patch)

- Reason:
  
    ```
    SelectEventPlugin does not fire onSelect while it thinks a mouse button is held. It only clears that state when a mouseup, contextmenu or dragend reaches a React root, but react-dom listens for mouseup on the root container only. A drag selection that starts inside the app and is released outside every root (for example below the bottom edge of the browser window) sends its mouseup to <html>, so onSelect stays off until the next click inside the app. Inputs that track their selection through onSelect keep a stale one: the composer copies an empty string on Cmd+C and Shift+Enter inserts the line break at the old caret.
    The patch also listens for mouseup on the owner document, next to the existing selectionchange listener. A mouseup inside a root is still handled once, because dispatchEventForPluginEventSystem drops the document-level copy of an event that targets a node inside a root.
    ```
  
- Upstream PR/issue: https://github.com/facebook/react/issues/26165 (closed as stale without a fix; `main` still only listens for `selectionchange` on the document)
- E/App issue: https://github.com/Expensify/App/issues/107116
- PR introducing patch: 🛑

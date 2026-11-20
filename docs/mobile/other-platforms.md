# Other platforms

Show the chat in a Flutter, native iOS or Android app, or anything that can show a web page.

Any web view can do what the React Native screen does.

## Steps

1. Load `https://support.example.com/embed?source=<source>` in a web view, with JavaScript and
   DOM storage on. The source must be [one the install knows](index.md#add-a-source).
2. Expose `window.ReactNativeWebView.postMessage(text)` to the page. The chat sends its messages
   to it as JSON strings. The first is `{ "channel": "helpwren", "type": "ready" }`.
3. Answer by running
   `window.dispatchEvent(new MessageEvent("message", { data: <message> }))` in the page: send
   `hello`, then `identify` with the user's token, `context`, and `open` for a conversation.
4. Listen for `unread`, `identity` and `close`.

Every message is defined in
[`packages/widget/src/protocol.ts`](../../packages/widget/src/protocol.ts). For push, see
[Firebase](firebase.md) or [Your own backend](webhook.md).

# Helpwren in a mobile app

The chat runs in your app as one screen: the install's own `/embed` page in a web view. The
same page is used on the web, so the app gets every change to the chat with no release of its
own.

## React Native and Expo

```bash
npx expo install react-native-webview
pnpm add @helpwren/react-native
```

```tsx
import { SupportScreen } from "@helpwren/react-native";

export function Support({ route, navigation }) {
  return (
    <SupportScreen
      baseUrl="https://support.example.com"
      source="customer_app"
      token={() => auth.getAccessToken()}
      context={{ appVersion: "3.2.0", screen: route.params?.from }}
      conversationId={route.params?.conversationId}
      onUnread={setBadge}
      onClose={() => navigation.goBack()}
    />
  );
}
```

| Prop             | What it does                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `baseUrl`        | The address of your Helpwren install.                                                      |
| `source`         | Which of the install's sources this app is. Add it under Settings first.                   |
| `token`          | The logged-in user's token, checked as **Settings > Identity** says. Leave out for guests. |
| `context`        | Plain values your team sees beside the conversation: app version, screen, order.           |
| `conversationId` | Opens that conversation, for a tapped notification.                                        |
| `onUnread`       | Called with the number of unread replies whenever it changes.                              |
| `onIdentity`     | Called when the chat signs in as your user, goes back to a guest, or could not sign in.    |
| `onClose`        | Shows a close button in the chat that calls this.                                          |

A token given as a function is fetched again once if it has expired. An inline function or
`context` object does not resend anything on each render; to switch users without logging out,
give the screen a new `key`.

For a badge outside the screen, call `getUnreadCount({ baseUrl, token })` when the app comes to
the front. It needs no Helpwren session: the install checks the token the same way.

**Permissions.** Sending photos from the chat needs `NSCameraUsageDescription`,
`NSPhotoLibraryUsageDescription` and `NSMicrophoneUsageDescription` on iOS (in Expo, under
`ios.infoPlist`) and the `CAMERA` permission on Android.

**Links.** Only the install's own pages load in the web view. Any other link, such as one in a
message, opens in the system browser.

## Other platforms

Flutter, native iOS and Android, or anything that shows a web page can do what the React Native
screen does:

1. Load `https://<install>/embed?source=<source>` in a web view, with JavaScript and DOM storage
   on.
2. Expose `window.ReactNativeWebView.postMessage(text)` to the page; the chat sends its messages
   to it as JSON strings. The first is `{ "channel": "helpwren", "type": "ready" }`.
3. Answer with messages delivered by running
   `window.dispatchEvent(new MessageEvent("message", { data: <message> }))` in the page:
   `hello`, then `identify` with the token, `context`, and `open` for a conversation.
4. Listen for `unread`, `identity` and `close`.

The messages are listed in `packages/widget/src/protocol.ts`.

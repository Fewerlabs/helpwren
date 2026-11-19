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

## Push notifications

Turn push on in **Settings > Mobile**: Expo, Firebase Cloud Messaging, your own backend, or any of them together. The scheduler that sends
emails must also call `POST /api/jobs/push` every minute with `CRON_SECRET`. Then, in the app:

```tsx
import * as Notifications from "expo-notifications";
import {
  registerSupportDevice,
  supportConversationId,
  unregisterSupportDevice,
} from "@helpwren/react-native";

// When the app starts with someone logged in, and when the push token changes.
await registerSupportDevice({
  baseUrl: "https://support.example.com",
  pushToken: (await Notifications.getExpoPushTokenAsync({ projectId })).data,
  platform: Platform.OS === "ios" ? "ios" : "android",
  source: "customer_app",
  token: await auth.getAccessToken(),
});

// When a notification is tapped, open the support screen on its conversation.
Notifications.addNotificationResponseReceivedListener((response) => {
  const conversationId = supportConversationId(response.notification.request.content.data);
  if (conversationId) navigation.navigate("Support", { conversationId });
});

// On logout.
await unregisterSupportDevice({ baseUrl: "https://support.example.com", pushToken });
```

A push goes out a few seconds after a reply, unless the person read it in the chat by then.
Several replies in one conversation show as one notification. The push carries the brand's name,
a short preview, and `{ type: "support", conversationId }`. To keep the banner away while the
support screen already shows that conversation, check `supportConversationId` in your
`setNotificationHandler` (Expo SDK 58 shows foreground notifications unless told not to).

Push needs a development build: Expo Go does not receive push notifications.

### Firebase

For native Android and iOS apps, Flutter, and React Native with `@react-native-firebase`:

1. In Firebase, open Project settings, Service accounts, and choose Generate new private key.
2. In **Settings > Mobile**, turn on Firebase Cloud Messaging and paste the whole key file. It is
   kept with the install's secrets; only its project and account are shown again. One key file
   covers Android and iOS.
3. Register each phone with its registration token and `provider: "fcm"`:

```tsx
import messaging from "@react-native-firebase/messaging";

await registerSupportDevice({
  baseUrl: "https://support.example.com",
  pushToken: await messaging().getToken(),
  provider: "fcm",
  platform: Platform.OS === "ios" ? "ios" : "android",
  source: "business_app",
  token: await auth.getAccessToken(),
});

messaging().onNotificationOpenedApp((message) => {
  const conversationId = supportConversationId(message.data);
  if (conversationId) navigation.navigate("Support", { conversationId });
});
```

From another platform, post the same fields to `POST /api/devices`. Notifications for one
conversation replace each other on both platforms, and carry the unread count as the badge.

### Your own backend

Turn on **Your own backend** in Settings > Mobile, enter your server's address, and make a
signing secret (shown once). Each push is then posted to your server, once per conversation:

```json
{
  "type": "push.reply",
  "id": "6d1f0c2e-…",
  "conversationId": "b3a7…",
  "contact": { "id": "8c41…", "externalId": "user_1002" },
  "title": "Acme",
  "preview": "It went out this morning.",
  "unreadCount": 2,
  "sentAt": "2026-11-19T10:00:00.000Z"
}
```

`contact.externalId` is your own id for the user when they are one of your logged-in users.
Answer with any `2xx` once you have taken it; anything else, or no answer within ten seconds,
and it is tried again on a later run. The test button sends `"type": "push.test"`. Use `id` to
ignore a repeat.

Every request carries `helpwren-signature: t=<unix seconds>,v1=<hex>`, an HMAC-SHA256 of
`<t>.<body>` under the secret. Check it against the raw body, and refuse anything over five
minutes old:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

function fromHelpwren(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=")));
  if (!parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest();
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
```

In JavaScript, `verifyWebhook(rawBody, header, secret)` from `@helpwren/adapters` does the same.

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

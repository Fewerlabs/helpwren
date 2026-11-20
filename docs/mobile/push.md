# Push notifications

Notify people on their phone when your team replies, through Expo, Firebase or your own backend.

## Before you start

- The [support screen](index.md) in your app.
- The [scheduled jobs](../operations/scheduled-jobs.md) running: a scheduler must call
  `POST /api/jobs/push` every minute with `CRON_SECRET`.
- A development build of your app. Expo Go does not receive push notifications.

## Choose a provider

Turn push on in **Settings → Mobile**. You can use any of these, together:

| Provider                 | For                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Expo                     | Expo apps, with Expo push tokens. Optionally an Expo access token                            |
| Firebase Cloud Messaging | Native Android and iOS, Flutter, and React Native with Firebase. See [Firebase](firebase.md) |
| Your own backend         | Any platform: each push is posted to your server. See [Your own backend](webhook.md)         |

## Register a phone with Expo

1. When the app starts with someone logged in, and whenever the push token changes, register the
   phone:

   ```tsx title="push.ts"
   import * as Notifications from "expo-notifications";
   import { Platform } from "react-native";
   import { registerSupportDevice } from "@helpwren/react-native";

   await registerSupportDevice({
     baseUrl: "https://support.example.com",
     pushToken: (await Notifications.getExpoPushTokenAsync({ projectId })).data,
     platform: Platform.OS === "ios" ? "ios" : "android",
     source: "customer_app",
     token: await auth.getAccessToken(),
   });
   ```

2. When a notification is tapped, open the support screen on its conversation:

   ```tsx title="push.ts"
   import { supportConversationId } from "@helpwren/react-native";

   Notifications.addNotificationResponseReceivedListener((response) => {
     const conversationId = supportConversationId(response.notification.request.content.data);
     if (conversationId) navigation.navigate("Support", { conversationId });
   });
   ```

3. On logout, stop pushes to the phone:

   ```tsx title="push.ts"
   import { unregisterSupportDevice } from "@helpwren/react-native";

   await unregisterSupportDevice({ baseUrl: "https://support.example.com", pushToken });
   ```

## What a push contains

A push goes out a few seconds after a reply, unless the person read it in the chat by then.
Several replies in one conversation show as one notification. The push carries the brand's name,
a short preview, and the data `{ type: "support", conversationId }`.

> [!TIP]
> To keep the banner away while the support screen already shows that conversation, check
> `supportConversationId` in your `setNotificationHandler`. Expo SDK 58 shows notifications in
> the foreground unless told not to.

The user's token is checked as **Settings → Identity** says, so a phone can be registered before
the person ever opens the chat. When registration fails, `registerSupportDevice` returns
`{ ok: false, reason }`, where `reason` is `expired`, `rejected`, `invalid` or `unavailable`.

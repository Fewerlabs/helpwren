# @helpwren/react-native

Reference for `@helpwren/react-native`, the support screen and push helpers for React Native and
Expo.

The setup guide is [React Native and Expo](../mobile/index.md). This page lists every export.

## Install

```bash title="Terminal"
npm install @helpwren/react-native
npx expo install react-native-webview
```

`react` (19 or later), `react-native` (0.79 or later) and `react-native-webview` (13.12 or later)
are peer dependencies, so your app owns their versions. No Supabase client goes into the app.

## SupportScreen

The chat as a screen.

| Prop             | Type                                        | What it does                                                                              |
| ---------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `baseUrl`        | `string`                                    | Your install's address                                                                    |
| `source`         | `string`                                    | The app's name, such as `customer_app`, shown to your team as the channel                 |
| `token`          | `string \| () => string \| Promise<string>` | The logged-in user's token, checked as **Settings → Identity** says. Leave out for guests |
| `context`        | `PageContext`                               | Plain values your team sees beside the conversation. See [Context](../users/context.md)   |
| `conversationId` | `string`                                    | Opens that conversation, for a tapped notification                                        |
| `onUnread`       | `(count: number) => void`                   | Called with the number of unread replies whenever it changes                              |
| `onIdentity`     | `(state: IdentityState) => void`            | Called when the chat signs in as your user, goes back to a guest, or fails to sign in     |
| `onClose`        | `() => void`                                | Shows a close button in the chat that calls this                                          |
| `style`          | `StyleProp<ViewStyle>`                      | The web view's style                                                                      |

## getUnreadCount

```ts title="Signature"
getUnreadCount({ baseUrl, token }): Promise<UnreadCountResult>
```

How many replies the user has not read, for a badge outside the screen. Returns
`{ ok: true, count }`, or `{ ok: false, reason }` with `reason` one of `expired`, `rejected` or
`unavailable`.

## registerSupportDevice

```ts title="Signature"
registerSupportDevice({ baseUrl, pushToken, provider, platform, source, token }): Promise<SupportDeviceResult>
```

Registers the phone for [push notifications](../mobile/push.md).

| Option      | Type                 | What it is                                         |
| ----------- | -------------------- | -------------------------------------------------- |
| `baseUrl`   | `string`             | Your install's address                             |
| `pushToken` | `string`             | The Expo push token, or the FCM registration token |
| `provider`  | `"expo" \| "fcm"`    | Which service the token is for. Default `expo`     |
| `platform`  | `"ios" \| "android"` | The phone's platform                               |
| `source`    | `string`             | The app's source                                   |
| `token`     | `string`             | The logged-in user's token                         |

## unregisterSupportDevice

```ts title="Signature"
unregisterSupportDevice({ baseUrl, pushToken }): Promise<SupportDeviceResult>
```

Stops pushes to the phone. Call it on logout.

Both device functions return `{ ok: true }`, or `{ ok: false, reason }` with `reason` one of
`expired`, `rejected`, `invalid` or `unavailable`.

## supportConversationId

```ts title="Signature"
supportConversationId(data: unknown): string | null
```

The conversation a notification is about, from its data, or `null` when it is not a Helpwren
notification.

## @helpwren/react-native/bridge

The messages between the app and the chat, on their own, for a custom screen. See
[Other platforms](../mobile/other-platforms.md).

Its changes are listed in
[`packages/react-native/CHANGELOG.md`](../../packages/react-native/CHANGELOG.md).

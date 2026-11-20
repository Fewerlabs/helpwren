# React Native and Expo

Show the chat as a screen of your React Native or Expo app, with an unread badge.

`SupportScreen` shows your install's own `/embed` page in a web view. The same page is used on
the web, so the app gets every change to the chat without a release of its own.

## Before you start

- React 19, React Native 0.79 or later, and `react-native-webview` 13.12 or later.
- A source for the app, such as `customer_app`. See [Add a source](#add-a-source).
- For logged-in users, identity set up in **Settings → Identity**. See
  [Know your users](../users/index.md).

## Add the screen

1. Install the package and the web view:

   ```bash title="Terminal"
   npx expo install react-native-webview
   npm install @helpwren/react-native
   ```

2. Render `SupportScreen` as a screen of your navigator:

   ```tsx title="support.tsx"
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

3. Add the permissions the chat needs to send photos: `NSCameraUsageDescription`,
   `NSPhotoLibraryUsageDescription` and `NSMicrophoneUsageDescription` on iOS (in Expo, under
   `ios.infoPlist`), and the `CAMERA` permission on Android.

Every prop is listed in the [package reference](../packages/react-native.md).

A token given as a function is fetched again once if it has expired. An inline function or
`context` object does not resend anything on each render; to switch users without logging out,
give the screen a new `key`.

## Show a badge outside the screen

Call `getUnreadCount` when the app comes to the front:

```tsx title="badge.ts"
import { getUnreadCount } from "@helpwren/react-native";

const result = await getUnreadCount({
  baseUrl: "https://support.example.com",
  token: await auth.getAccessToken(),
});
if (result.ok) setBadge(result.count);
```

It needs no Helpwren session: the install checks the token the same way the chat does.

## Links

Only the install's own pages load in the web view. Any other link, such as one in a message,
opens in the system browser.

## Add a source

An install accepts conversations only from the sources it knows, and starts with `web` alone.
There is no settings page for sources yet: add one in the Supabase SQL editor, listing every
source the install should accept:

```sql title="Supabase SQL editor"
insert into public.settings (key, value)
values ('sources', '["web", "customer_app"]')
on conflict (key) do update set value = excluded.value;
```

> [!WARNING]
> `SupportScreen`'s `source` must be one of these, or the app cannot start a conversation or
> register for push.

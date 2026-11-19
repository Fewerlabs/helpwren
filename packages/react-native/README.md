# @helpwren/react-native

> **Status: early.** The support screen and push helpers work; not yet tried on real devices.

Helpwren's chat as a screen of a React Native or Expo app. It shows the install's own chat page
in a web view, tells it who the user is and what they are looking at, and passes back the
unread count. See [docs/mobile.md](../../docs/mobile.md) for setup.

```tsx
import { SupportScreen, getUnreadCount } from "@helpwren/react-native";

<SupportScreen
  baseUrl="https://support.example.com"
  source="customer_app"
  token={() => auth.getAccessToken()}
  context={{ appVersion: "3.2.0", screen: "Booking" }}
  onUnread={setBadge}
  onClose={() => navigation.goBack()}
/>;
```

- `react`, `react-native` and `react-native-webview` are peer dependencies: your app owns their
  versions. Install the web view with `npx expo install react-native-webview`.
- No Supabase or other Helpwren packages go into the app.
- `registerSupportDevice`, `unregisterSupportDevice` and `supportConversationId` connect
  push notifications; see the guide.
- `@helpwren/react-native/bridge` has the message helpers on their own, for a custom screen.

# @helpwren/react-native

Helpwren's chat as a screen of a React Native or Expo app. It shows the install's own chat page
in a web view, tells it who the user is and what they are looking at, and passes back the
unread count. See [docs/mobile.md](https://github.com/Fewerlabs/helpwren/blob/main/docs/mobile.md)
for setup.

```bash
npm install @helpwren/react-native
npx expo install react-native-webview
```

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
- Nothing else comes along but `helpwren/protocol`, a few hundred bytes of message helpers. No
  Supabase client goes into the app.
- `registerSupportDevice`, `unregisterSupportDevice` and `supportConversationId` connect
  push notifications; see the guide.
- `@helpwren/react-native/bridge` has the message helpers on their own, for a custom screen.

Covered by unit tests, not yet tried on real devices. Reports are welcome in the issues.

## Licence

MIT

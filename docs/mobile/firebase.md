# Firebase

Send pushes through Firebase Cloud Messaging, for native, Flutter and React Native Firebase apps.

One service account key covers Android and iOS.

## Set it up

1. In the Firebase console, open **Project settings → Service accounts** and choose **Generate
   new private key**.
2. In **Settings → Mobile**, turn on **Firebase Cloud Messaging** and paste the whole key file.
   It is kept with the install's secrets; only its project and account are shown again.
3. Register each phone with its registration token and `provider: "fcm"`:

   ```tsx title="push.ts"
   import messaging from "@react-native-firebase/messaging";
   import { Platform } from "react-native";
   import { registerSupportDevice, supportConversationId } from "@helpwren/react-native";

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

Notifications for one conversation replace each other on both platforms, and carry the unread
count as the badge.

## From another platform

Post the same fields to the install from any app:

```bash title="Terminal"
curl -X POST https://support.example.com/api/devices \
  -H "Content-Type: application/json" \
  -d '{"pushToken":"<FCM registration token>","provider":"fcm","platform":"android","app":"business_app","token":"<user token>"}'
```

`app` is the app's name, such as `business_app`, and `token` the user's token as **Settings →
Identity** checks it. `DELETE /api/devices` with `{ "pushToken": "..." }` stops pushes to a
phone.

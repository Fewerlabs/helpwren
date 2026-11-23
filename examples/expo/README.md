# Expo example

A small Expo app with Helpwren's `SupportScreen`: a home screen with a **Contact support** button
that opens the chat and shows an unread badge. It loads `@helpwren/react-native` from
`packages/react-native/src`, so a change there shows here on reload, with no build.

It is not part of the pnpm workspace: Expo and React Native keep their own `node_modules` here.
It is on Expo SDK 57, the one Glown's customer app uses, so it opens in the same Expo Go.

## Run it

1. Start Helpwren (`pnpm dev` at the repo root), on http://localhost:3000.
2. Add the app's source to the install, once. In the Supabase SQL editor (locally, Studio at
   http://127.0.0.1:54323):

   ```sql
   insert into public.settings (key, value)
   values ('sources', '["web", "mobile_app"]')
   on conflict (key) do update set value = excluded.value;
   ```

   List every source the install already has, or they stop working.

3. Install and start the app:

   ```bash
   cd examples/expo
   npm install
   npx expo start --ios
   ```

   Press `a` instead for an Android emulator, which reaches your computer at `10.0.2.2`.

## Another install

Set the address and source in `.env.local`:

```bash
EXPO_PUBLIC_HELPWREN_URL=https://support.example.com
EXPO_PUBLIC_HELPWREN_SOURCE=customer_app
```

The chat starts as a guest. To sign a user in, pass `token` to `SupportScreen`; see
[React Native and Expo](../../docs/mobile/index.md).

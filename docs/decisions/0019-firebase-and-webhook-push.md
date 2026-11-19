# 0019: Firebase and webhook push

- **Status:** accepted
- **Date:** 2026-11-19

## Context

[ADR 0018](0018-push-notifications.md) pushed through Expo only, so only Expo apps could be
notified. Native Android and iOS apps, Flutter, and React Native apps built on
`@react-native-firebase` hold Firebase registration tokens, and some products already send
notifications their own way (OneSignal, their own Firebase project, text messages).

## Decision

- **Every device says which service it is for.** `devices.provider` is `expo` (the default, so
  existing apps keep working) or `fcm`. `POST /api/devices` and `registerSupportDevice` take
  it, and check the token's shape against it. One install can serve an Expo app and a Firebase
  app at once: each phone is reached through its own service.
- **Firebase through its HTTP v1 API, with `fetch` and `jose` only.** The adapter signs a JWT
  with the service account's key, trades it at Google's token address for an access token, and
  keeps that until shortly before it expires. One service account covers Android and iOS, since
  Firebase hands iOS pushes to Apple. Each message sets `android.collapse_key` and
  `android.notification.tag` to the conversation and `apns-collapse-id` likewise, the unread
  count as `notification_count` and the APNs badge, and the same `data` as Expo. FCM has no
  receipts: a token it calls `UNREGISTERED`, or `INVALID_ARGUMENT` for a message whose payload
  is the same for every device, is forgotten at once, as Firebase advises. The `firebase-admin`
  package was not needed.
- **A webhook for anything else.** When it is on, each due push is posted once per conversation
  to the product's own address as JSON: the event type and a fresh id, the conversation, the
  contact's Helpwren id and the product's id for them, the title, a preview and the unread
  count. The body is signed with HMAC-SHA256 over `<timestamp>.<body>` under a secret kept in
  `secrets`, sent as `helpwren-signature: t=<seconds>,v1=<hex>`; a receiver turns away a
  signature over five minutes old, so a copied request cannot be replayed. `verifyWebhook` in
  `@helpwren/adapters` is the reference check. Redirects are refused, so the event goes only
  where the admin pointed it.
- **The channels are switches.** The `push` setting holds `{ expo, fcm, webhook: { url } | null }`;
  the first version's `{ provider }` is still read. Settings > Mobile turns each on, keeps the
  Expo token, the service account's key file and the webhook secret with the other secrets,
  shows them again only as "saved" (and the Firebase project and account, which are not
  secret), and sends a signed test event to the webhook.
- **A run counts a push as sent when any channel took it.** A channel that could not be reached
  has the push tried again on a later run, unless another channel already delivered it.

## Consequences

- Firebase's v1 API takes one message a request; a person with many devices costs as many
  requests, ten at a time.
- Firebase now describes `token` and the first Android config as being replaced by `fid` and
  `android_v2`. Firebase SDKs still hand apps registration tokens, so this sends to those, and
  can move when the SDKs do.
- The webhook sends on the same schedule as the other channels, after the same check that the
  reply is still unread, and is told nothing about devices: the product decides where to send.
- Sending has been tested against stand-ins for Google, Firebase and a backend, not the real
  services or real phones.

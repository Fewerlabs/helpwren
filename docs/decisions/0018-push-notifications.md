# 0018: Push notifications to mobile apps

- **Status:** accepted
- **Date:** 2026-11-19

## Context

Someone who wrote from a product's mobile app has usually left the support screen by the time
the team replies. They should hear about the reply on their phone, open the right conversation
with a tap, and not be pushed about a reply they already read. The product's own backend should
need no new code.

## Decision

- **A push adapter, Expo first.** `PushAdapter` in `@helpwren/adapters` has `send` (returns a
  ticket per message) and `receipts` (asks later what became of them). The Expo adapter talks to
  Expo's push API with `fetch`: a hundred messages a request, an access token when the project
  has enhanced push security, and both `collapseId` and `tag` set to the conversation, so later
  replies replace the earlier notification on iOS and Android. Firebase and webhooks can follow
  behind the same interface.
- **The same queue pattern as email.** A trigger queues a push for each reply from the team,
  fifteen seconds ahead. The scheduler that runs `/api/jobs/email` also runs `/api/jobs/push`
  every minute. A run groups what is due by conversation and sends one notification showing the
  newest reply, with the person's total unread count as the badge, and skips any conversation
  whose replies were read in the chat meanwhile.
- **Devices belong to a contact or to a product user.** An app registers its logged-in user at
  start with its own token (`POST /api/devices`), before they have ever written, so the device
  is kept against their product id; a guest who has written registers with their session. A
  push for a conversation goes to its contact's devices and to their product account's. A phone
  that registers again moves to whoever it belongs to now. `DELETE /api/devices` takes only the
  push token, which only the app on that phone knows. Nobody signed in can read or write
  devices, the queue or the tickets.
- **Dead devices are forgotten.** A ticket or a receipt saying the device is not registered
  removes it. Receipts are asked for a quarter of an hour after sending, and tickets are let go
  once answered or a day old.
- **The push carries little.** The title is the brand's name, the body a short preview, and the
  data only `type: "support"` and the conversation id. `@helpwren/react-native` reads that with
  `supportConversationId` and opens the support screen on it.
- **Settings > Mobile** turns push on and keeps the Expo access token with the other secrets,
  never shown again once saved.

## Consequences

- Pushes go out up to a minute after a reply, at the scheduler's pace, and not at all without
  `CRON_SECRET` and a scheduler.
- The server decides "read meanwhile" from the unread count, not from whether the app is open.
  Suppressing a banner while the support screen is showing that conversation is the app's own
  notification handler's job.
- Sending has been tested against a stand-in for Expo, not real Expo or real phones.

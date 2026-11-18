# 0008: How guest chat reaches the server

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Anyone can open the chat, with no account. The server side has to give a visitor a session, let
them start a conversation without being able to forge anything about it, deliver messages live,
and slow down abuse, all with code that is public.

## Decision

- **A guest is an anonymous Supabase Auth user.** They get the `authenticated` role like anyone
  else, so the access rules from [ADR 0006](0006-database-and-access-rules.md) apply unchanged.
  Their row in `contacts` is created with their first conversation, so a visitor who opens the
  chat and leaves stores nothing but the session.
- **Starting a conversation goes through the server:** `POST /api/conversations`. It verifies the
  caller's session, applies the install's settings, and calls one database function,
  `start_conversation`, that creates the contact, the conversation and the first message in a
  single transaction. Only the server may call that function. After that, a contact adds
  messages directly, under the access rules.
- **What guests are asked for is a setting**, `guest_details`: `email` (the default), `phone`,
  `email_or_phone` or `none`. A name is asked for with any of the first three. The server
  enforces it, counting details the contact gave before, so the form cannot be bypassed and a
  returning guest is not asked twice. Phone numbers are stored in international format.
- **API routes accept a session two ways:** a bearer token, which the chat frame sends because
  browsers block cookies in a frame on someone else's site, or the inbox's cookies. Failures use
  one body shape, `{ error: { code, message } }`, with the codes defined in `@helpwren/core`.
- **Request and response shapes are Zod schemas in `@helpwren/core`**, used by the routes and,
  next, by the client that calls them.
- **Triggers keep a conversation in step with its messages:** the preview, the time, each side's
  unread count, and reopening a resolved conversation when the contact writes again. Marking as
  read is `POST /api/conversations/{id}/read`, because a contact may not update a conversation.
- **Live updates use Realtime Broadcast, sent by database triggers,** which Supabase recommends
  over listening to table changes. Channels are private, and one policy on `realtime.messages`
  decides who may listen: `conversation:<id>` for anyone who can read that conversation,
  `contact:<id>` for that contact, `inbox` for agents.
- **Limits live in the database:** 20 messages a minute and 5 new conversations an hour per
  contact, raised with the code `HW429`, which the API reports as `rate_limited`.
- **The secret key is read in one server-only module** and used through one admin client, after
  the caller has been verified.

## Consequences

- Realtime takes about five seconds to answer a subscription it refuses. A screen that
  subscribes to something the person may not read waits that long for the error.

- The limits are per session, and a new guest session is cheap. Supabase limits anonymous
  sign-ins to 30 an hour per address, and that is the only brake on someone who keeps making new
  sessions until the captcha planned with the abuse-protection work is added.
- Anonymous users are never removed automatically. A cleanup job for guests with no
  conversations is needed before a busy install fills up with them.
- The app now needs `SUPABASE_SECRET_KEY` to start.
- A phone number is only stored and shown. Nothing sends a text message or calls it yet.

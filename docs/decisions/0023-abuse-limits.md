# 0023: Limits on abuse

- **Status:** accepted
- **Date:** 2026-11-19

## Context

Before a public launch, anyone on the internet can open the chat, start conversations, upload
files and rate articles. The limits so far were a per-process counter in memory on one route,
and two counts in the database (messages a minute, conversations an hour). An install that runs
more than one copy of the app, as most hosts do, gave each copy its own count. Files were put in
the bucket straight from the browser under whatever type the browser named. Article ratings
went straight into the database with no limit at all. See the
[abuse review](../security/abuse-review.md) for everything that was found.

## Decision

- **Request counts live in the database by default.** `public.rate_limits` is an unlogged table
  of fixed windows, counted by `hit_rate_limit(key, max, seconds)`, which only the server may
  call. Every copy of the app shares it, and it costs one small write per request, which the
  free plan carries. The store is an adapter (`RateLimitStore` in `@helpwren/adapters`), so
  `RATE_LIMIT_STORE=memory` keeps counts in the process for a single server, and Redis or
  another store can be added the same way. Every limit is in one file,
  `apps/web/src/lib/api/limits.ts`.
- **A network is counted by a keyed hash, never by its address.** The server reads the address
  from `CLIENT_IP_HEADER` (default `x-forwarded-for`, last entry: the one the nearest proxy
  saw), treats an IPv6 /64 as one network, and keeps only an HMAC of it with the server's
  secret. This changes [ADR 0020](0020-live-visitors.md), which said the address is never read:
  it is read, for counting and blocking, and still never stored. Networks are counted loosely
  (offices and phone networks share addresses); sessions, browsers and conversations tightly.
- **The database keeps the limits that must hold for every path.** `limit_messages` refuses a
  blocked contact (`HW403`), more than twenty messages a minute from one sender or thirty from
  one conversation's contacts (`HW429`), the same words a third time in five minutes, a guest's
  bare link before the team has replied, and more than five links in one message (`HW422`).
  `start_conversation` adds a day's limit, three tickets an hour, the same spam checks, and
  blocked networks.
- **Bots are turned away by cheap checks first.** The start and ticket forms carry a field only
  bots fill in and say how long they were open; the route refuses either sign. A captcha
  (Cloudflare Turnstile, as an adapter) is off by default and switched on in Settings → General
  with its site key; its secret key lives only in the server's environment
  (`TURNSTILE_SECRET_KEY`). Verified users of the host product never answer it.
- **The team can block.** Agents may change `contacts.blocked_at` and nothing else on a contact,
  and add or remove a row of `blocked_networks` for a network a contact has written from.
  Triggers stamp who and when, and write `audit_events`, which only the team reads and nobody
  writes by hand.
- **Files go through the server.** `POST /api/conversations/[id]/attachments` checks the caller
  may use the conversation, reads the file's bytes to learn what it really is, refuses markup and
  anything not on the list, and stores it in the conversation's folder under the type it found.
  Browsers lose their insert policy on the bucket. Links to anything but a picture are signed as
  downloads (`Content-Disposition: attachment`).
- **Ratings go through the server** (`POST /api/articles/[id]/feedback`): one answer per article
  per network a day, thirty an hour. A browser may no longer insert into `article_feedback`.
- **Headers.** The proxy sets a Content-Security-Policy on every page at request time (it names
  the Supabase project and the allowed domains); `next.config.ts` sets `nosniff`, a referrer
  policy, a permissions policy and HSTS on every response. Pages other than the chat and an
  embedded help center may only be framed by the app itself.

## Consequences

- One extra database write per limited request. An install that would rather not can switch to
  memory and accept a count per process.
- Behind a proxy that does not set the client's address, networks are not counted, only
  sessions; the review says how to set the header.
- A shared network that is blocked blocks everyone on it. The dashboard says so before it does.
- The Content-Security-Policy still allows inline scripts, because Next.js writes its own
  without a nonce on statically rendered pages.
- Reading the help center and searching it go straight to Supabase's Data API, which only
  Supabase's own limits protect.

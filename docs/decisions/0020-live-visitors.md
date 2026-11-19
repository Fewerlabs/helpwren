# 0020: Live visitors

- **Status:** accepted
- **Date:** 2026-11-19

## Context

The team wants to see who is on the site now, where they are and what they are reading, and to
write to them first, as Intercom and Featurebase do. The same details should show beside a
contact's conversations. Helpwren has to run on Supabase's free plan, where Realtime
connections, messages and Auth users are all counted, and the chat creates nothing until a
visitor writes ([ADR 0008](0008-guest-chat-server.md)).

## Decision

- **Check-ins over plain HTTP, not Realtime.** The chat calls `POST /api/visitors` once a minute
  while the host tab is visible, at once when the page changes, and not while it is hidden. The
  widget tells the chat about page changes (single-page apps included) and visibility with a new
  `page` message, and sends `document.referrer` in `hello`. The route needs no session; one from
  the chat, when there is one, says which contact the browser is. It is limited to twenty
  check-ins a minute per visitor id, in the server's memory.
- **One row per browser, no Auth user.** `public.visitors` is keyed by a random id the chat keeps
  in its own `localStorage`. `record_visit` upserts it: page, referrer, browser, system, device,
  language, time zone, location, first and last seen, a session count (a new session after half
  an hour away), the last ten pages, and copies the details to the contact when there is one
  (new columns on `contacts`, also in `contact_summaries`). Agents read the table; only the
  server writes it.
- **Browser and place without paying for them.** A few regular expressions read the User-Agent.
  Country, region and city come only from `x-vercel-ip-*` or `cf-ipcountry` headers; without
  them the location stays unknown. No GeoIP database and no lookup service, and the IP address
  is never read or stored.
- **The live list polls.** The Visitors section lists browsers seen in the last two minutes and
  asks again every fifteen seconds while it is open, through React Query.
- **A first message waits on the row.** An agent's message is stored as `pending_*` on the
  visitor. The next check-in answers `{ outreach: true }`; the chat starts a guest session if it
  has none and calls `POST /api/visitors/outreach`, where `claim_visitor_outreach` makes the
  contact if needed, starts a conversation whose first message is the agent's (assigned to them),
  ties the browser to the contact and clears the message. It then reaches the visitor like any
  reply, and the widget shows the newest unread reply beside the launcher (`unread.latest`). A
  visitor who left keeps the message waiting until they return, or the agent takes it back.
- **Switches in General.** The public `visitors` setting holds `{ tracking, liveList }`, both on
  by default. With tracking off the chat sends nothing and the route answers 410; with the live
  list off the section leaves the sidebar and its page says how to turn it on. Writing first
  needs both.
- **Old browsers are pruned in passing.** About one check-in in a hundred deletes browsers with
  no contact unseen for thirty days, so no scheduled job is needed.
- **Plain functions, not security definer.** The brief asked for security-definer functions. The
  database's structure test forbids security definer functions in `public`, and the existing
  server-only functions (`start_conversation`, `merge_guest_into_user`) are plain functions that
  only `service_role` may execute. These follow them: `service_role` already bypasses the rules.

## Consequences

- An open tab costs one small request a minute and one row update; nothing is held open.
- The live list is up to a minute and fifteen seconds behind, and a first message reaches a
  visitor on their next check-in, up to a minute later.
- Anyone who knows a browser's id could take up a message meant for it. The id is random and
  lives only in that browser's storage, which is as private as the chat's own session.
- Without Vercel or Cloudflare in front of the install, there is no location. The rate limit is
  per server process.
- A contact's details are those of the browser they used last, so they can change between
  devices.

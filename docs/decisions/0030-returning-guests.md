# 0030: Returning guests

- **Status:** accepted
- **Date:** 2026-11-21

## Context

A guest is an anonymous Supabase Auth user ([ADR 0008](0008-guest-chat-server.md)). Their
session lives in the browser's own storage, under `helpwren.session`, because the chat runs in a
frame on other sites. Losing it used to lose the guest: the chat showed a new visitor, asked who
they were, and their next message started another guest. The team still saw the first
conversation in the inbox.

An owner reported exactly that on a phone, after leaving the help center for a while. The ways it
happens, found in the code and reproduced in `apps/web/e2e/returning-guest.spec.ts`:

- **A session that could not be checked was taken for none.** `sessions.current()` asked
  `supabase.auth.getClaims()`, which, on a fresh page, fetches the signing keys (or asks for the
  user, on a project with a shared secret) once, without retrying. Any network failure there, or
  a refresh that failed for half a minute, gave `null`. The chat then showed a new visitor, and
  `startGuest()` signed in anonymously over the session that was still in storage. A phone coming
  back to a tab, or reloading one Safari had discarded, often has no network for that first
  request.
- **A session Supabase Auth refuses is gone for good.** When a refresh token is used again after
  the reuse interval, Supabase revokes the session; supabase-js then deletes it. That happens
  when a frozen tab's refresh was answered but the answer never arrived, when iOS ends a page
  before storage reaches disk, and when a refresh is rate limited from a shared address.
- **Storage that is cleared.** Safari deletes a site's script-written storage after seven days of
  use without a visit, and people clear their browsers.
- **Details asked again.** Whether to ask was decided by whether the conversation list was empty,
  so a list that failed to load asked a guest who had given their details.

Retrying fixes the first. The others need something that survives the session.

## Decision

- **A session that cannot be checked is never taken for none.** `sessions.current()` throws on a
  network failure, so `startGuest()` cannot replace it, and the chat asks again, up to half a
  minute apart, while showing that it is loading.
- **The install gives a guest's browser a key, in a cookie of its own**, alongside the session:
  32 random bytes, `HttpOnly`, kept in `guest_keys` only as a SHA-256 hash. Over HTTPS it is
  `__Host-helpwren-guest; Secure; SameSite=None; Partitioned`; over plain HTTP, for local work,
  `helpwren-guest; SameSite=Lax`. It lasts 400 days, the most browsers allow.
- **One route ties a guest to the browser's key, `POST /api/guest`.** The chat calls it when a
  guest starts and each time a guest's chat opens. It needs the guest's bearer session. If the
  key is that guest's, it is swapped for a new one. If it is another guest's, the browser lost
  that guest's session and started again, and `restore_guest` moves what the old guest had to the
  new one, in one transaction, before the swap. The old guest's sign-in is then removed, as
  identifying a guest removes theirs.
- **A browser with no session asks first, `POST /api/guest/check`,** and starts a guest to bring
  back only when the key is good. Nobody gets a guest for opening the chat.
- **The old guest's things are moved, not their session restored.** Supabase Auth has no call
  that makes a session for an anonymous user, and the sign-in link that ADR 0013 follows needs an
  address, which would make the guest a user. Moving uses the same function as identifying a
  guest (`private.move_contact`, shared with `merge_guest_into_user`), so a restored guest is an
  ordinary guest, and identifying them later works as before. The contact's id changes; the team
  sees the same name, details and conversations.
- **Tabs take turns.** Bringing a guest back, and starting one, run under a Web Lock, so two tabs
  that both find no session do not both start a guest. Without Web Locks, the next visit's
  `POST /api/guest` merges the two.
- **Logging out of the host product gives the key up** (`DELETE /api/guest`) before signing out,
  so the next person at a shared computer does not get the last guest back.
- **Details come from the contact.** A guest whose contact has the details the install asks for
  is not asked again, the same test the server makes.

### Security and privacy

The key is a bearer credential: whoever holds it can take over that guest's conversations, as
whoever held the session in storage could before. So:

- It is `HttpOnly`, so a script on the page cannot read it, and it never appears in a URL, a log
  or a response body.
- It is checked on the server against its hash, swapped on every use, runs out after 400 days
  without one, and goes when its guest is identified, removed or logs out.
- It is only used with the caller's own guest session, and only by requests from the install's
  own pages: a request whose `Sec-Fetch-Site` is anything but `same-origin` is refused, and the
  routes send no CORS headers.
- A guest the team has blocked is not brought back.
- It is set only for someone who has written, and only to keep their own conversation. It is
  `Partitioned`, so it cannot follow a visitor from one site to another.

## Consequences

- One more request each time a guest's chat opens, and one for a visitor with no session.
- Bringing a guest back costs a new anonymous user, and the old one is removed.
- **What browsers still prevent.** The key lives where the chat's storage lives, and both are
  kept apart for each top-level site:
  - The help center at the install's own address and the widget on a site in the same registrable
    domain (`support.example.com` and `example.com`, or a `/help` rewrite on `example.com`) share
    one guest. So do two tabs.
  - The widget on a different site is a different guest from the help center, in every current
    browser: Chrome and Firefox partition a frame's storage and cookies by the top-level site, and
    Safari does too.
  - Safari blocks cookies in a frame on another site altogether, so there the key cannot be set,
    and a guest whose storage Safari clears cannot be brought back. First-party, on the help
    center or the chat page, it works.
  - Clearing the browser's data, a private window, or another browser or device starts a new
    guest. Only identifying the visitor ([ADR 0014](0014-identity-adapters.md)) follows a person
    across those.

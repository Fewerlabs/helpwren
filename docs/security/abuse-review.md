# Abuse and misuse review

- **Date:** 2026-11-19
- **Scope:** everything a visitor without an account can reach before a public launch: the API
  routes, the database's access rules and functions, storage, Realtime channels, and the headers
  pages are served with.
- **Decision record:** [ADR 0022](../decisions/0022-abuse-limits.md)

Severity is what an attacker could do before the fix, on an install with default settings:

- **High:** cheap to do at scale, and costly to the install or its team.
- **Medium:** needs some effort or a second mistake, or harms only part of the install.
- **Low:** a weakness in depth, or one that takes knowledge an attacker should not have.

## Findings

| #   | Severity | Finding                                                        | Status                |
| --- | -------- | -------------------------------------------------------------- | --------------------- |
| 1   | High     | Public routes had no limits, or limits per server process      | Fixed                 |
| 2   | High     | An attachment's type was whatever the browser said             | Fixed                 |
| 3   | High     | Article ratings could be inserted without limit                | Fixed                 |
| 4   | Medium   | No spam checks, no captcha and no way to block anyone          | Fixed                 |
| 5   | Medium   | The dashboard, sign-in page and help center could be framed    | Fixed                 |
| 6   | Medium   | No Content-Security-Policy outside the chat's framing rule     | Fixed, inline allowed |
| 7   | Medium   | A page address from the browser became a link in the inbox     | Fixed                 |
| 8   | Low      | A browser tied to one contact could be claimed by another      | Fixed                 |
| 9   | Low      | API routes took a team member's cookies on cross-site requests | Fixed                 |
| 10  | Low      | Session cookies were not marked `Secure` behind HTTPS          | Fixed                 |
| 11  | Low      | Article search took a query of any length                      | Fixed                 |
| 12  | Low      | A contact can send any name and photo with "is typing"         | Partly fixed          |
| 13  | Low      | Anyone can read who on the team is online                      | Left, by design       |
| 14  | Info     | Session cookies are readable by scripts                        | Left                  |
| 15  | Info     | Reading the help center goes straight to Supabase              | Left                  |
| 16  | Info     | Signing users in from the server may hit Supabase's IP limits  | Owner's decision      |

### 1. Public routes had no limits, or limits per server process (High)

Only `POST /api/visitors` was limited, in memory, per process, by a visitor id the browser makes
up. A script could invent a new id per request. Every other route a visitor can reach had no
limit of its own. The database limited conversations to five an hour per session, but guest
sessions are free (thirty an hour per address on Supabase's defaults), so one address could
start 150 conversations an hour, each a contact in the inbox.

**Fixed.** Request counts now live in the database by default (`public.rate_limits`, counted by
`hit_rate_limit`, which only the server may call), so every copy of the app shares one count.
`RATE_LIMIT_STORE=memory` keeps counts in the process for a single server. Each route counts the
caller's network, as a keyed hash, and, where it has one, their session or browser:

| Route                                      | Per network  | Per session, browser or article |
| ------------------------------------------ | ------------ | ------------------------------- |
| `POST /api/conversations`                  | 30 an hour   | 10 an hour per session          |
| `POST /api/visitors`                       | 300 a minute | 20 a minute per browser         |
| `POST /api/visitors/outreach`              | 60 a minute  | 10 a minute per session         |
| `POST /api/identify`                       | 60 a minute  |                                 |
| `POST /api/unread`                         | 120 a minute |                                 |
| `POST`, `DELETE /api/devices`              | 30 a minute  |                                 |
| `POST /api/conversations/[id]/attachments` | 200 an hour  | 30 per 10 minutes per session   |
| `POST /api/articles/[id]/feedback`         | 30 an hour   | 1 a day per article             |

The database keeps its own limits too, which hold for writes that never pass through the app:
20 messages a minute per sender, 30 a minute per conversation from its contacts, 5 new
conversations an hour and 20 a day per contact, and 3 tickets an hour. Messages are at most
5,000 characters, a ticket's subject 200, and a file 10 MB. Supabase limits anonymous sign-ins
to 30 an hour per address (`supabase/config.toml`, and the Auth settings of a hosted project).

### 2. An attachment's type was whatever the browser said (High)

Browsers uploaded straight into the `attachments` bucket. The bucket's list of allowed types is
checked against the `Content-Type` the browser sends, so a program could be stored as
`application/pdf` and a page of HTML as `image/png`, and the team would be handed it as that.
Supabase Storage serves files inline, without `X-Content-Type-Options: nosniff`.

**Fixed.** `POST /api/conversations/[id]/attachments` stores files now. It checks the caller may
use the conversation, reads the file's bytes (PNG, JPEG, GIF and WebP by their signatures, PDF,
old Office files by their container, new ones by the ZIP holding a document or a workbook, text
by being valid UTF-8 with no markup), refuses anything else (HTML, SVG, XML, programs), and stores
it under `<conversation id>/<random>-<name>` with the type it found. It refuses blocked contacts,
and holds at most 200 files per conversation. Browsers, agents included, have no insert policy on
the bucket any more. Links to pictures open in place; links to every other file are signed as
downloads, so Storage sends `Content-Disposition: attachment`. The per-folder read rule and the
check that a message only names files in its own conversation's folder were already right.

### 3. Article ratings could be inserted without limit (High)

`article_feedback` took inserts from anyone, with no session, straight through the Data API. A
script could make any article look loved or hated, and fill the table.

**Fixed.** Ratings go through `POST /api/articles/[id]/feedback`, which counts one answer per
article per network a day (more are thanked for and not counted) and thirty an hour. Browsers may
no longer insert.

### 4. No spam checks, no captcha and no way to block anyone (Medium)

**Fixed.**

- The database refuses a guest's message that is only a link before the team has replied, any
  message with more than five links, and the same words a third time in five minutes. Verified
  users of the host product are spared the link checks.
- The start and ticket forms carry a field nobody sees and say how long they were open; the
  route refuses a filled field, or a form with fields sent within 100 ms of opening. That bar
  is low on purpose: the end-to-end tests drive a real browser that sends a form in about
  200 ms, as a headless bot would, so a higher bar fails the tests without telling more bots
  from people. A script that posts to the API directly sends no time at all; the limits and
  the captcha are what stop it.
- An optional captcha: Cloudflare Turnstile, off by default. Switched on in Settings → General
  with its site key; the secret key goes in `TURNSTILE_SECRET_KEY`. Without the secret it stays
  off, so a half-done setup never locks visitors out. Verified users are never asked.
- A contact's page has **Block** and **Block with their network**. A blocked contact cannot
  write, start a conversation or send a file; a blocked network cannot start a conversation, and
  no contact who last wrote from it can write. Every block and unblock is written to
  `audit_events`, with who did it. The network is stored only as a keyed hash.

### 5. The dashboard, sign-in page and help center could be framed (Medium)

Only `/embed` had a `frame-ancestors` rule. Another site could show the dashboard in an invisible
frame and trick a signed-in team member into clicking in it.

**Fixed.** Every page now says only the app itself may frame it, except the chat and an embedded
help center, which keep the install's allowed domains (any site until an admin lists some, so a
new install works).

### 6. No Content-Security-Policy outside the chat's framing rule (Medium)

**Fixed, with inline scripts still allowed.** The proxy sets a policy on every page at request
time: scripts, frames, connections and forms only from the app, its Supabase project, Turnstile
and YouTube's privacy-enhanced player; no plugins; no other `<base>`. `next.config.ts` adds
`nosniff`, a referrer policy, a permissions policy and HSTS to every response. Inline scripts
remain allowed, because Next.js writes its own into statically rendered pages without a nonce.

### 7. A page address from the browser became a link in the inbox (Medium)

`page.url` in `POST /api/conversations` accepted any URL, including `javascript:` and `data:`,
and the inbox drew it as a link. React 19 refuses `javascript:` links and browsers refuse to
open `data:` pages, so it was not exploitable today, but it rested on both.

**Fixed.** The page must be an `http` or `https` address, and the inbox draws a link only for
one, which covers conversations stored before. Typing avatars are held to the same rule. Links
inside articles were already limited by the renderer (`safeHref`), and the visitor check-in
already allowed only web addresses.

### 8. A browser tied to one contact could be claimed by another (Low)

`link_visitor` gave a browser to whoever named its id when starting a conversation, even if it
belonged to someone else, and copied its pages and location onto the new contact, who can read
their own row. The id is random and private to the browser, so this needed a leaked id.

**Fixed.** A browser already tied to a contact stays theirs.

### 9. API routes took a team member's cookies on cross-site requests (Low)

Routes read the request body as JSON whatever its type, and fell back to the session cookies
when there was no bearer token, so a form on another site could in principle act as a signed-in
team member. `SameSite=Lax` cookies already stopped that.

**Fixed, in depth.** A request the browser marks `Sec-Fetch-Site: cross-site` is not signed in
by its cookies.

### 10. Session cookies were not marked `Secure` behind HTTPS (Low)

**Fixed.** The team's session cookies are `SameSite=Lax` and, when `NEXT_PUBLIC_APP_URL` is
HTTPS, `Secure`.

### 11. Article search took a query of any length (Low)

**Fixed.** `search_articles` reads the first 200 characters and 12 words.

### 12. A contact can send any name and photo with "is typing" (Low)

Typing events are broadcast by browsers on `typing:<conversation>`, which the conversation's
contact and the team may send on. A contact can claim a team member's name, but only inside their
own conversation, to themselves and the team. **Partly fixed:** the photo must be a web address.
**Left:** the name; the inbox could ignore names from anyone who is not on the team.

### 13. Anyone can read who on the team is online (Low, by design)

`presence:team` is readable without a session, so the chat can say whether the team is around.
It carries team members' ids, names and photos, which the chat shows anyway. **Left.** The
owner may prefer to send only a count.

### 14. Session cookies are readable by scripts (Info)

The dashboard's Supabase client reads its session from cookies in the browser, so they cannot be
`HttpOnly`. Script injection on the dashboard would expose the session. The policy above and
React's escaping are the defence. **Left.**

### 15. Reading the help center goes straight to Supabase (Info)

Help center pages, search in the chat and Realtime use Supabase's Data API with the public key,
which the app's limits do not see. They read only what the rules allow, and a hosted project
has Supabase's own limits. **Left.**

### 16. Signing users in from the server may hit Supabase's IP limits (Info, owner's decision)

`POST /api/identify` makes a session for a host product's user with `generateLink` and
`verifyOtp`, called from the app's server. On a hosted project, `verifyOtp` counts towards the
per-address limit on token verifications (30 per 5 minutes by default) for the server's own
address, so a busy install could see identify fail. Raise that limit in the project's Auth
settings, or move the exchange to an admin-only path when Supabase offers one.

## What was checked and found right

### Tables and functions

Every table in `public` has Row Level Security on and at least one policy; browser roles are
granted only what a policy exists for; no `security definer` function is in `public`
(`structure.test.sql`). Walked table by table:

| Table                                                        | Visitor with no session | Contact                                                         | Team                    |
| ------------------------------------------------------------ | ----------------------- | --------------------------------------------------------------- | ----------------------- |
| `contacts`                                                   | nothing                 | reads own row                                                   | reads all; may block    |
| `conversations`, `messages`                                  | nothing                 | own, and verified organisation's; writes messages as themselves | read and update all     |
| `notes`, `conversation_events` (internal)                    | nothing                 | only status, ticket and rating events                           | all                     |
| `conversation_ratings`                                       | nothing                 | rates own resolved conversation, once                           | reads                   |
| `settings`                                                   | public rows             | public rows                                                     | all; admins write       |
| `articles`, `collections`                                    | published               | published                                                       | all; write              |
| `article_feedback`                                           | nothing                 | nothing                                                         | reads                   |
| `visitors`                                                   | nothing                 | nothing                                                         | reads                   |
| `secrets`, `devices`, `email_queue`, `push_*`, `rate_limits` | nothing                 | nothing                                                         | nothing (server only)   |
| `blocked_networks`, `audit_events`                           | nothing                 | nothing                                                         | read; block and unblock |

Server-only functions (`start_conversation`, `identify_contact`, `merge_guest_into_user`,
`record_visit`, `link_visitor`, `claim_visitor_outreach`, `claim_*_queue`, `hit_rate_limit`)
are executable by `service_role` alone. Their ids come from a session the server verified, never
from the request body. Triggers stamp a message's sender role and time, a conversation's
organisation, ticket numbers, article authors, and who blocked whom, so none of these can be
forged from a browser.

### Routes

| Route                                        | Who                            | How they are known                       | Taken from the body, and checked                             |
| -------------------------------------------- | ------------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `POST /api/conversations`                    | guests and users               | bearer session                           | message, details, page (web address), source (from settings) |
| `POST /api/conversations/[id]/read`          | owner or team                  | bearer or cookie session                 | nothing; the id must be theirs                               |
| `POST /api/conversations/[id]/attachments`   | owner or team                  | bearer or cookie session                 | the file, checked by its bytes                               |
| `POST /api/visitors`                         | anyone                         | optional bearer session                  | browser id (format), page (web address)                      |
| `POST /api/visitors/outreach`                | guests and users               | bearer session                           | browser id, source (from settings)                           |
| `POST`, `DELETE /api/visitors/[id]/outreach` | team                           | bearer or cookie session                 | the message                                                  |
| `POST /api/identify`                         | anyone with a token            | the identity adapter                     | the token, verified by the adapter                           |
| `POST /api/unread`                           | anyone with a token or session | the adapter, or the session              | the token                                                    |
| `POST`, `DELETE /api/devices`                | anyone with a token or session | the adapter, or the session              | push token (format), app (from settings)                     |
| `POST /api/articles/[id]/feedback`           | anyone                         | nobody; counted by network               | helpful or not; the article must be published                |
| `GET /api/widget`                            | anyone, any site               | nobody                                   | nothing; public settings only                                |
| `POST /api/jobs/*`                           | the scheduler                  | `CRON_SECRET`, compared in constant time | nothing                                                      |

No route redirects to an address from the request. CORS is open only on `GET /api/widget` and
the article rating route, which use no credentials; every other route is same-origin only.

### Realtime channels

Listening: `inbox`, `notes:*` and `viewing:*` are the team's; `contact:<id>` is that contact's;
`conversation:*` and `typing:*` follow the conversation's own read rule; `presence:team` is open
(finding 13). Sending: typing only on a conversation one may read, presence only by the team.
Internal notes and team-only events never travel on a channel a contact may join.

## Tests added

- pgTAP: `abuse_limits.test.sql` (counts, blocking, network blocks, the audit log, spam rules,
  limits per conversation, tickets and day, claiming a browser, long searches), and updated
  `attachments.test.sql`, `article_feedback.test.sql` and `structure.test.sql`.
- Route tests against the local database: `apps/web/tests/abuse.db.test.ts` (honeypot, timing,
  page addresses, bare links, network keys, blocked networks, the captcha, check-in limits,
  uploads by bytes, other people's conversations, blocked contacts, ratings).
- Client library tests: blocking, refused messages, links signed as downloads, browsers kept out
  of the bucket, ratings through the API.
- Unit tests: network keys, file signatures, the content policy, the captcha adapter, the rate
  limit stores, the start form's hidden field.

## For the owner to decide

1. **Network limits.** The numbers per network are loose so offices and phone networks are not
   caught. Tighten them if spam gets through (`apps/web/src/lib/api/limits.ts`).
2. **`CLIENT_IP_HEADER`.** Set it for the host: `x-forwarded-for` suits Vercel and most proxies;
   behind Cloudflare use `cf-connecting-ip`. With no proxy in front, networks are not counted.
3. **Supabase Auth settings on the hosted project:** anonymous sign-ins per hour, token
   verifications (finding 16), and whether to turn on Supabase's own captcha for sign-ins.
4. **Team presence** (finding 13): keep names and photos, or send only whether anyone is online.
5. **The form timing bar** (`MIN_FORM_MS`, 100 ms). Raising it to a second or more would turn
   away more headless bots, but the end-to-end tests would need to wait before sending a form.
6. **A nonce-based Content-Security-Policy**, which would remove `'unsafe-inline'` at the cost of
   rendering every page per request.

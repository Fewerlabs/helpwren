# Security and abuse protection

How an install protects itself from spam and misuse, and what you can turn on or adjust.

Guest chat is open to anyone, so limits are built in rather than optional. Most need nothing from
you.

## Rate limits

Public routes are limited per network and per session, with counts kept in the database so they
hold across server instances. A refused request answers `rate_limited` with a `Retry-After`
header.

| Route                            | Per network  | Per session or browser          |
| -------------------------------- | ------------ | ------------------------------- |
| Start a conversation             | 30 an hour   | 10 an hour per session          |
| Visitor check-ins                | 300 a minute | 20 a minute per browser         |
| Take up a message from the team  | 60 a minute  | 10 a minute per session         |
| Sign in a user (`/api/identify`) | 60 a minute  |                                 |
| Unread count (`/api/unread`)     | 120 a minute |                                 |
| Register or remove a device      | 30 a minute  |                                 |
| Attachments                      | 200 an hour  | 30 every 10 minutes per session |
| Article ratings                  | 30 an hour   | 1 a day per article             |
| Guest keys (`/api/guest`)        | 300 a minute | 30 a minute per session         |

The database adds its own limits on top:

- 20 messages a minute per sender, and 30 a minute per conversation from its contacts.
- 5 conversations an hour and 20 a day per contact, and 3 tickets an hour.
- Messages up to 5,000 characters, and ticket subjects up to 200.
- 20 email replies an hour per conversation.

A network is one IPv4 address or one IPv6 /64. Addresses are stored only as a keyed hash, never
as they are. Behind Cloudflare, set `CLIENT_IP_HEADER=cf-connecting-ip` so the install sees the
visitor's address; see [Environment variables](../operations/environment-variables.md).

## Spam checks

- Before your team has replied, a guest cannot send a message that is only a link, or one with
  more than five links. Verified users skip these checks.
- The same text sent a third time within five minutes is refused.
- The chat's forms carry a hidden field and a timing check that catch simple bots.

## Captcha

Turn on **Ask guests to show they are people** in **Settings → General → Spam** to have guests
pass [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) before their first
message. Most see a box tick itself. Verified users are never asked.

1. Create a Turnstile widget in your Cloudflare dashboard.
2. Set its secret key as `TURNSTILE_SECRET_KEY` in the app's environment, and redeploy.
3. Turn on the setting and paste the **Turnstile site key**.

> [!NOTE]
> Without `TURNSTILE_SECRET_KEY` the captcha stays off, whatever the setting says. The Docker
> Compose file does not pass it to the app yet; add it to the `helpwren` service's environment.

## Blocking

From a contact's page, **Block** stops them writing, starting conversations and uploading files.
**Block with their network** also stops anyone on that network from starting a conversation.
Email replies from a blocked contact are recorded but not added. Every block is written to the
audit log, and **Unblock** reverses it.

## Attachments

- Up to 5 files a message, 10 MB each, and 200 a conversation.
- PNG, JPEG, WebP, GIF, PDF, TXT, CSV, DOC, DOCX, XLS and XLSX. The type is checked from the
  file's contents, not its name; HTML, SVG and XML are refused.
- Files other than images are served as downloads.

## Headers and cookies

- Every page has a Content Security Policy. Only [allowed domains](allowed-domains.md) can frame
  the chat and the embedded help center; no other page can be framed.
- Every response sends `X-Content-Type-Options: nosniff`, a strict referrer policy, a permissions
  policy that turns off the camera, microphone, location and payments, and HSTS.
- Session cookies are `SameSite=Lax`, and `Secure` when `NEXT_PUBLIC_APP_URL` is HTTPS. A
  cross-site request is never signed in by cookies.
- A guest's browser holds one more cookie, the guest key, which brings their conversations back
  if the browser loses their session. It is `HttpOnly`, random, kept only as a hash on the
  server, swapped for a new one on each visit, and given up when the host product logs the
  visitor out. A request another site started cannot use it. See
  [Returning guests](../chat/returning-guests.md).

## Report a vulnerability

Report security problems privately, as described in the
[security policy](../../SECURITY.md).

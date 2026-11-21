# 0029: The dashboard as an installable app, with web push for the team

- **Status:** accepted
- **Date:** 2026-11-21

## Context

There is no native app for the team. The owner asked for the dashboard to install on phones and
computers, to prompt for it on a phone, to offer updates when a new version is deployed, and for
notifications to arrive with the app closed. Until now desktop notifications and sounds came only
from an open dashboard tab, and their settings lived in the browser's `localStorage`.

The app serves Next's files under `assetPrefix: "/help/_assets"` and sets a Content-Security-Policy
per request in `src/proxy.ts`. The widget (`/embed`, `/widget.js`), the help center (`/help`) and
the chat page (`/chat`) are shown inside other people's sites and must not change.

## Decision

- **A hand-written service worker, `apps/web/public/sw.js`, no library.** It does four things:
  pages from the network with a small offline page as the fallback, content-hashed static files
  (`/help/_assets/_next/static/*`, `/icons/*`) from a cache, pushes, and waiting for the go-ahead
  to update. Serwist and next-pwa were not used: they precache the build and route everything,
  which is more than this needs, and next-pwa does not follow Next 16. Pages and API answers are
  never cached, since they hold conversations and contacts. Writes, `/api/*`, Supabase and
  Realtime are never touched. In development nothing is cached, since file names have no hashes.
- **The worker's scope is `/dashboard`.** It lives at `/sw.js`, so it may take any scope at or
  below `/`, and registers with `/dashboard`. The widget, the help center and the chat page are
  outside it, which the e2e suite checks.
- **The manifest is a route at `/dashboard/manifest.webmanifest`, not `app/manifest.ts`.** Next
  links an `app/manifest.ts` from every page, so the help center and the chat page would offer to
  install the team's app. Only the dashboard and the sign-in page link it. It is named
  "{brand} Support" from the install's branding, starts at `/dashboard/inbox`, and uses the
  canvas colour from the design tokens.
- **The manifest's scope is `/`, wider than the worker's.** Signing in (`/login`), choosing a
  first password and accepting an invite happen outside `/dashboard`. Out of scope, an installed
  iPhone app opens them in an in-app browser that keeps its own cookies, so signing in there would
  not sign in the app. The cost: on Android, a link to the help center from another app may open
  in the installed app.
- **Files the browser fetches without a session skip the proxy.** `sw.js`, `/icons/` and the
  manifest are left out of the proxy's matcher. The policy gains `manifest-src 'self'`;
  `worker-src 'self'` was already there. `/sw.js` is served `Cache-Control: no-cache`.
- **Each deploy is a new worker.** The page registers `/sw.js?v=<HELPWREN_BUILD_VERSION>`. A new
  address is a new worker, which installs and waits. The page also asks `/api/health` for the
  server's version on load, on focus (at most once a minute) and every 30 minutes; a different
  version registers that version's worker and shows a sticky toast with **Update**, which posts
  `SKIP_WAITING` and reloads once the new worker controls the page. A waiting worker for the build
  the page already runs takes over quietly, so the toast never offers the version on screen.
- **Install prompt: our own banner.** On a phone-sized screen in a browser, Chromium's
  `beforeinstallprompt` is kept and offered from a banner with **Install**; iOS Safari has no such
  event, so the banner shows Share, then Add to Home Screen. "Not now" is remembered for 30 days in
  `localStorage`. On a computer there is no banner, only **Install app** in the account menu when
  the browser offers it, and an **App** page in personal settings with the version, **Check for
  updates** and the install state.
- **Web push with VAPID, through the `web-push` library, server only.** The keys are made once and
  kept in the `secrets` table as `vapid_keys`; `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` override
  them, and `VAPID_SUBJECT` (else the app's HTTPS address) names who push services can contact.
  Encrypting a push by hand (RFC 8291) is small but easy to get subtly wrong; `web-push` is the
  reference implementation and has no native dependencies.
- **`agent_push_subscriptions` holds one row per browser,** with the endpoint unique and the
  "Notify me about" choice of that browser. Notification settings were per browser before and
  stay so; the server now has the one value it needs on the row it uses. Row level security lets a
  team member read, add, change and remove only their own rows. `save_push_subscription` moves a
  browser to whoever saves it, since holding the endpoint proves it is that browser; it covers two
  team members sharing one computer. Deactivating someone deletes their rows.
- **The Desktop notifications switch subscribes and unsubscribes the browser.** It still asks for
  permission and still shows in-tab notifications. While it is on, each dashboard load saves the
  subscription again, so people who had it on before this change get pushes with no action.
  In-tab notifications now go through the service worker too, with the conversation as the tag,
  so a push and an in-tab notification for one conversation replace each other.
- **Pushes are queued by a database trigger and sent by the push job.** New contact messages are
  inserted in several ways: by the guest's browser through the Data API, by `start_conversation`,
  by `receive_email_reply`. No single route sees them all, so an `after insert` trigger on
  `messages` queues one row in `agent_push_queue` for every `guest` or `user` message, the same
  shape as `push_queue` for contacts' phones ([0018](0018-push-notifications.md)). The existing
  `/api/jobs/push` scheduler run drains it with `processAgentPushQueue`. A Supabase Database
  Webhook would be faster but needs setup in each install; sending from the email queue would tie
  pushes to email being configured.
- **One push per conversation per run.** Messages are grouped by conversation, the newest is the
  preview, and a conversation already read (`unread_for_agents = 0`) is skipped. Each push has the
  conversation as its notification `tag` and its Web Push `Topic`, so a burst still waiting at the
  push service collapses into one, with a one-hour TTL and high urgency. The payload is the
  contact's name, at most 100 characters of the message and the conversation's address, nothing
  more. A push service answering 404 or 410 has its subscription deleted.

## Consequences

- With a scheduler calling `/api/jobs/push` every minute, a push arrives within about a minute.
  Without `CRON_SECRET`, nothing sends them; in-tab notifications still work.
- Push needs HTTPS (or `localhost`). On iPhone and iPad it needs iOS 16.4 or later and the app on
  the Home Screen; Safari tabs cannot subscribe.
- Changing the VAPID keys orphans every subscription; browsers subscribe again on their next
  dashboard load, since the saved key no longer matches.
- Signing out does not unsubscribe the browser. Turning the switch off, a push service dropping
  the subscription, deactivation or another team member signing in on it does.
- End-to-end tests stand in for the browser's push service, which a test browser cannot reach;
  the database tests stand in for sending.

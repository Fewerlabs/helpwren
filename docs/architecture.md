# Architecture

This page describes how the code is organised. For what Helpwren is, see the
[README](../README.md).

## Monorepo

pnpm workspaces with Turborepo. Apps are in `apps/`, libraries in `packages/`.

| Workspace                | Role                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| `apps/web`               | The one Next.js app: `/embed`, `/help`, `/dashboard`, `/api`               |
| `packages/design-system` | Tokens, components and illustrations                                       |
| `packages/core`          | Headless client library                                                    |
| `packages/widget`        | The script a site loads to show the chat, published as `helpwren`          |
| `packages/react-native`  | `SupportScreen`: the chat as a screen of a React Native app, in a web view |
| `packages/adapters`      | Identity, push and inbound email adapters; storage to come                 |
| `packages/cli`           | Installer and upgrader: `pnpm helpwren install` and `upgrade`              |
| `packages/config`        | Shared TypeScript, ESLint and Prettier configuration                       |

Internal packages are consumed as TypeScript source: their `exports` point at `src`, and the app
compiles them (`transpilePackages`). There is no per-package build step until a package is
published. See [ADR 0001](decisions/0001-tooling.md).

## Installing: `packages/cli` and `deploy/`

`pnpm helpwren install` writes the env file, applies the migrations with `supabase db push` and
prints what to do next, for Supabase Cloud or for Docker. `deploy/docker` holds the Compose file
that includes Supabase's own self-hosting stack, fetched at a pinned release, beside the app's
image (`apps/web/Dockerfile`) and a scheduler. The first admin is made in the browser at
`/setup`. See [Choose how to install](get-started/index.md) and
[ADR 0024](decisions/0024-installer-and-setup-wizard.md).

## The database: `supabase/`

Helpwren runs on Supabase: Postgres, Auth, Realtime and Storage.

| Path                   | Holds                                                           |
| ---------------------- | --------------------------------------------------------------- |
| `supabase/config.toml` | Settings for the local stack the Supabase CLI runs in Docker    |
| `supabase/migrations`  | Tables, access rules and triggers, as plain SQL in order        |
| `supabase/tests`       | pgTAP tests of the access rules and triggers                    |
| `supabase/seed.sql`    | Demo data for local development; never loaded by a real install |

The browser reaches the database with a public key, so Row Level Security decides who can read
and write each row, and the tests are the proof. Anything the rules do not allow goes through the
app's server. See [ADR 0006](decisions/0006-database-and-access-rules.md) for the rules and
[Development setup](contributing/setup.md#local-database) for the commands.

To change the schema, add a migration with `pnpm exec supabase migration new <name>`, give any
new table its grants, policies and a test file, then run `pnpm db:reset`, `pnpm db:test` and
`pnpm db:types`.

## The app: `apps/web`

```
src/
  app/          Routes only: thin, compose features
  features/     One folder per feature
  lib/          App-wide utilities, such as environment parsing
```

Routes stay thin. A route file reads parameters, composes feature components and sets metadata.
Logic, state and data access live in a feature.

### Environment variables

`src/lib/env.ts` declares every variable in a Zod schema and parses it once. The parse runs at
server start through `src/instrumentation.ts`, so a missing or malformed variable stops the app
with a message naming it. Add a variable to the schema and to `.env.example` in the same change.

### Talking to the database

Screens never read tables. They call `@helpwren/core`, and the app's only job is to give it a
Supabase client that knows whose request this is.

| File                                 | Role                                                              |
| ------------------------------------ | ----------------------------------------------------------------- |
| `src/lib/supabase/server.ts`         | A Supabase client for the current request, from its cookies       |
| `src/lib/helpwren.ts`                | `getHelpwren()`: the client library on top of that client         |
| `src/proxy.ts`                       | Refreshes the session before a page renders. Runs on `/dashboard` |
| `src/features/agent-auth/session.ts` | `requireAgent()`, which every team-only page calls first          |

These are server-only. Client components reach the server through Server Actions, as the sign-in
form does. See [ADR 0007](decisions/0007-agent-sign-in.md).

### The visitor's chat

`/embed` is the one screen that talks to Supabase from the browser. `src/features/chat/client.ts`
builds the client library with a Supabase client that keeps the visitor's session in the
browser's own storage, because the chat runs in a frame on someone else's site, where browsers
block cookies. Two rules follow from that:

- **Opening the chat creates nothing.** A guest session is started with the first message, so
  page views do not fill the database with guests who never wrote.
- **Server data lives in TanStack Query**, as everywhere else. Live updates write into the same
  cache (`src/features/chat/hooks/use-chat.ts`), so a message that arrives over the live channel
  and one that arrives from a reload are the same thing to the components.

### The dashboard

Everything the team uses is under `/dashboard`. `src/app/dashboard/layout.tsx` checks the sign-in
and wraps every page in `DashboardShell` (`src/features/dashboard`), which draws the sidebar and
provides the signed-in team member's Helpwren client to the sections inside it. Each page also
calls `requireAgent()` itself, because a layout is not re-run on every navigation. A new section
is a folder under `src/app/dashboard`, a feature, and an entry in
`src/features/dashboard/sections.ts`.

Settings pages load their data in the Server Component and save through Server Actions
(`src/features/settings/actions.ts`). Settings go through the client library, where the database
lets only admins write. The team is changed with the secret key, after checking the caller is an
admin (`src/features/settings/server/team.ts`); a team member's own name is changed the same way,
found by who is signed in. Invites (`src/features/invites`) keep only a hash of each link's token
in `agent_invites`, which no browser role can read; `/invite/[token]` and `/choose-password` sit
outside the dashboard. See [ADR 0028](decisions/0028-team-invites.md). Notification preferences are personal and stay in the browser
(`src/features/notifications`), where `Notifier` in the dashboard shell listens to the inbox
and shows a desktop notification or plays a sound. See
[ADR 0010](decisions/0010-dashboard-and-settings.md).

The dashboard installs as an app (`src/features/pwa`). Its manifest is a route at
`/dashboard/manifest.webmanifest`, linked only from the dashboard and the sign-in page; its service
worker, `public/sw.js`, is registered with the scope `/dashboard` as `/sw.js?v=<build version>`, so
each deploy waits as a new worker until the team member chooses **Update**. With desktop
notifications on, the browser is also subscribed to web push: `agent_push_subscriptions` holds one
row per browser, a trigger on `messages` queues each contact message in `agent_push_queue`, and
`processAgentPushQueue` (`src/lib/agent-push.ts`) sends them from `/api/jobs/push` with the
install's VAPID keys. See [ADR 0029](decisions/0029-installable-dashboard.md).

Every section is laid out by `DashboardPage` (`src/features/dashboard`): one card holds the
section's navigation and, where there is one, the list it selects from; a second card holds the
work, in columns (`Panel`s) divided by a hairline. Views, segments, the open conversation and the open contact are kept in the address,
so a reload or a shared link lands in the same place.

Searching is done by the database, never by filtering what the browser happens to have loaded:
`conversations.search` and `contacts.list({ search })` in the client library.

### Three features, one thread

| Feature        | Whose screen  | Its client                                                                           |
| -------------- | ------------- | ------------------------------------------------------------------------------------ |
| `chat`         | The visitor's | `chat/client.ts`: session in the browser's storage                                   |
| `inbox`        | The team's    | The dashboard's (`dashboard/client.ts`): the session the sign-in page put in cookies |
| `conversation` | Both          | None of its own                                                                      |

`conversation` holds `Thread`: a conversation's messages, live, and the reply box. It takes its
client from `HelpwrenProvider` (`src/lib/helpwren-context.tsx`), which each screen sets up with
its own. The provider hands down a function that returns the client, not the client, so nothing
is created while rendering on the server.

The layouts follow a common shape for support tools, which people already know how to use: the
chat opens on a home screen with tabs along the bottom, and the inbox is three panels side by
side. The look is Helpwren's own.

### Live visitors

While the install tracks visitors, the chat checks in through `POST /api/visitors` about once a
minute while its page is showing (`src/features/chat/hooks/use-visitor-tracking.ts`). The route
reads the browser from the User-Agent (`src/lib/user-agent.ts`) and the place from the hosting
platform's headers (`src/lib/geo.ts`), and `record_visit` keeps one row per browser in
`visitors`, copying the details to its contact. `src/features/visitors` is the dashboard's
Visitors section, which polls every fifteen seconds, and the "Visitor" part of the inbox's and
the contact page's side panels. A team member's first message waits on the row until the
browser takes it up through `POST /api/visitors/outreach`. Nothing here uses Realtime, and a
browsing visitor gets no Auth user. See [ADR 0020](decisions/0020-live-visitors.md).

### Live channels

Everything live travels on private Realtime channels, which the access rules on
`realtime.messages` open by the channel's name (`helpwren_listen` and `helpwren_listen_team` to
listen, `helpwren_send` to send). `packages/core/src/realtime.ts` opens one channel per topic for
each client and shares it among everything on screen that needs it.

| Channel             | Sent by              | Carries                                     | Heard by                          |
| ------------------- | -------------------- | ------------------------------------------- | --------------------------------- |
| `inbox`             | the database         | conversations as they change                | the team                          |
| `contact:<user id>` | the database         | that contact's conversations as they change | that contact                      |
| `conversation:<id>` | the database         | the conversation's messages and events      | its contact and the team          |
| `notes:<id>`        | the database         | internal notes                              | the team                          |
| `typing:<id>`       | browsers (broadcast) | who is typing a reply                       | its contact and the team          |
| `viewing:<id>`      | browsers (presence)  | which team members have it open             | the team                          |
| `presence:team`     | browsers (presence)  | which team members have the dashboard open  | anyone, with or without a session |

A conversation's `typing:` and `viewing:` channels are joined only while it is open on screen
(`src/features/conversation/hooks/use-typing.ts`, `src/features/inbox/hooks/use-viewers.ts`).
The dashboard shell joins `presence:team` (`src/features/dashboard/hooks/use-team-presence.ts`),
and the chat watches it only while the chat is open, to say "We're online"
(`src/features/chat/hooks/use-team-online.ts`). Nothing on these three is stored. See
[ADR 0021](decisions/0021-typing-presence-and-saved-replies.md).

### Saved replies

`saved_replies` holds the team's prepared answers and each agent's personal ones, with an
optional `/shortcut`. `savedReplies` in the client library lists, creates, changes and removes
them, and `fillPlaceholders` fills `{contact.first_name}` and the rest. `src/features/saved-replies`
holds Settings > Saved replies and the reply box's picker (`useSavedReplyPicker`), which the
`conversation` feature's `Composer` uses on the team's side. See
[ADR 0021](decisions/0021-typing-presence-and-saved-replies.md).

### Attachments

A message can carry up to five files. The reply box uploads each one to the private
`attachments` bucket as it is chosen (`attachments.upload` in the client library) and sends their
paths with the message; the thread asks for signed links to show them. Who may read a file
follows who may read its conversation. See [ADR 0012](decisions/0012-attachments.md).

### The knowledge base and the help center

Articles are sorted into collections. `collections` and `articles` in the client library do
everything to them, and the access rules decide who may: published articles are public, drafts
are the team's. See [ADR 0016](decisions/0016-knowledge-base.md).

| Where                               | What                                                                |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/features/articles`             | The dashboard's section: the table, the dialogs and the editor page |
| `src/features/help-center`          | The public pages' components: header, lists, the article, feedback  |
| `src/lib/help-center-data.ts`       | What the public pages read, as a visitor, kept between requests     |
| `src/lib/help-embed.ts`             | The options a host may pass to the embedded form, checked strictly  |
| `src/features/chat` (`help-screen`) | The chat's Help tab and the suggestions on its home screen          |

An article's body is a document tree, written with `RichTextEditor` and drawn with `RichText`,
both in the design system. The public pages load none of the editor.

The public pages are drawn for each request and never while building, when there is no
database to ask. What they read is kept for a minute under the tag in
`src/lib/help-center-cache.ts`, so a busy help center asks the database a few times a minute and
not on every visit. `refreshHelpCenter` (articles), `saveBranding` and `saveProfile` clear it,
so a change made in the app shows within a request or two.

**Embedding.** A host shows the help center in a frame with `/help?embed=1`. `src/proxy.ts`
checks the options, limits framing to the allowed domains and passes what it accepted to the
pages in a header. The frame tells the page around it how tall it is with one message, so the
host can size it:

```js
{ channel: "helpwren", type: "help-height", height: 1240 }
```

`height` is the content's height in CSS pixels. It is sent when the page loads and whenever the
height changes. A host should check `event.origin` is the install's address before using it.
The Installation settings page has the snippet to copy.

### The widget

A site shows the chat by loading `/widget.js`, which the app builds from `packages/widget` when
it starts. The script draws a launcher and opens `/embed` in a frame; the two talk with
`postMessage`. `src/features/chat/hooks/use-embed-bridge.ts` is the chat's end of that, and
`src/proxy.ts` sets which sites may frame it. See [ADR 0009](decisions/0009-widget.md).

The script asks `GET /api/widget` where the launcher sits and what colour and icon it has, and
checks every value of the answer before using it. The chat itself gets its brand, greeting,
welcome message and quick replies from the public settings, as before. The Branding page shows
the same script in a preview: `createWidget` mounted inside an element, with the unsaved form
sent to the chat frame as a `preview` message. The frame takes those only from its own origin,
loads no session, and sends nothing.

A site can also shape the widget from its own page: put the chat inline in an element, open it
from its own buttons, and override position, colour and size. [Add the chat](chat/index.md) lists
every option.

`/chat` is the same chat on a page of its own, for a link where there is no site to put the
widget on. The logo lives in the public `brand` storage bucket, which only admins may write to.

### API routes

API routes do what the access rules leave to the server. Each one follows the same steps:

1. `getCaller(request)` (`src/lib/api/caller.ts`) verifies the session, from a bearer token or
   the inbox's cookies, and says whether the caller is an agent.
2. The body is parsed with a Zod schema from `@helpwren/core`.
3. Only then does it use `supabaseAdmin` (`src/lib/supabase/admin.ts`), the one client that holds
   the secret key.
4. Failures go through `apiError` (`src/lib/api/respond.ts`), so every route answers in the same
   shape.

The secret key is read in `src/lib/server-env.ts`, apart from the public variables, so importing
it from browser code fails the build. Route tests live in `apps/web/tests` and call the handlers
directly against the local database: `pnpm test:db`. See
[ADR 0008](decisions/0008-guest-chat-server.md).

### Identified users

A product's own logged-in users are confirmed by an identity adapter from `@helpwren/adapters`
(`src/lib/identity.ts` picks the one the install is set up for) and then signed in by
`sessionForUser` (`src/lib/supabase/user-session.ts`), which gives the same person the same
Supabase Auth user on every device. `identify_contact` in the database records them as a
verified contact, and `merge_guest_into_user` gives them what they did as a guest on that device.
The widget's `identify`, `reset` and `setContext` reach the chat as messages
(`src/features/chat/hooks/use-embed-bridge.ts`), and `use-identity.ts` signs the chat in or out
through `sessions.identify` and `sessions.reset` in the client library. Admins choose the adapter and make signing keys on Settings > Identity. Signing keys and other credentials live in the `secrets` table, which only the
server can read. See [ADR 0013](decisions/0013-sessions-for-identified-users.md) and
[ADR 0014](decisions/0014-identity-adapters.md).

### Email

`src/lib/email` sends and receives mail. Sending goes through an `EmailAdapter` (SMTP or Resend,
chosen by the environment, or else an SMTP server saved in Settings > Email and kept in
`secrets`; see `choose.ts`) and `sendEmail`; the database queues what is owed and
`processEmailQueue` (`queue.ts`), called by `/api/jobs/email`, sends it, with a Message-ID chain
per conversation so mail apps thread it. See [ADR 0015](decisions/0015-email.md).

Replies come back when Settings > Email turns them on. Each email's `Reply-To` is the reply
address with a signed token after a plus (`reply-address.ts`, keys in `secrets`). The provider
posts the reply to `/api/email/inbound/[provider]`, where an inbound adapter from
`@helpwren/adapters` (Resend, Postmark or the generic signed JSON) checks the request and parses
it. `inbound.ts` finds and checks the token, strips the quoted earlier messages
(`strip-reply.ts`), stores the files through the attachments flow, and calls
`receive_email_reply`, which adds the message as the contact with `channel = 'email'`. See
[ADR 0022](decisions/0022-reply-by-email.md).

### Features

Each folder in `src/features` is one feature. `features/example` is a complete, working one
(canned replies) that shows every convention; copy its shape.

```
features/<feature>/
  schemas/      Zod schemas, and the types inferred from them
  api/          Data access for this feature
  store/        A Zustand store for this feature's client state
  hooks/        Hooks that combine the above
  components/   UI, built only from @helpwren/design-system
  index.ts      The feature's public API
```

**Schemas come first.** A feature's data shapes are Zod schemas in `schemas/`. Types are inferred
with `z.infer` and never written a second time. The same schema validates a form, an API
response and an API request.

**`api/` is the boundary.** Everything that crosses it is parsed: answers with the response
schema before they are returned, input with the request schema before it is sent. Code inside the
feature can then trust its types. Errors a person can act on are their own classes (the example's
`ShortcutTakenError`), so the UI can put them where they belong.

**Two kinds of state, kept apart.**

- _Server state_ (anything fetched) lives in TanStack Query's cache. Cache keys for a feature are
  defined once, in a `keys` object in `hooks/`, so reads and invalidations cannot drift apart.
  Render a fetched list with `QueryList` and a single record with `QueryDetail`, not with
  `useQuery` and hand-written states: they draw the loading, empty and error states. The few
  exceptions are listed in the
  [conventions](contributing/conventions.md#use-the-component-that-already-does-it).
- _Client state_ (what the person has typed, opened or selected) lives in the feature's Zustand
  store. There is no global store. The store itself is not exported; components use selector
  hooks (`useSearch`, `useSetSearch`), so each re-renders only for the value it reads.

Do not copy server data into a store.

**Forms** use React Hook Form with the feature's Zod schema as the resolver, and `FieldList` from
the design system to render the fields. A server-side error that belongs to one field is set on
that field with `form.setError`.

**Components** import UI from `@helpwren/design-system` only: no Radix, no icon library, no deep
paths into the package. If something is missing, add it to the design system.

**`index.ts` is the public API.** Code outside the feature imports from `@/features/<feature>`
and nothing deeper. Inside a feature, files import each other by relative path.

ESLint enforces the last two rules (`apps/web/eslint.config.mjs`).

### Providers

`src/app/providers.tsx` wraps every route in the TanStack Query client and the tooltip provider.
The query client is created once per browser session, with a default `staleTime` so that moving
between screens does not refetch what was loaded a moment ago.

### Routes

| Route                               | What it is                                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/design`                           | The design system running in the app, with the example feature at the bottom                                                                                                |
| `/embed`                            | The visitor's chat: start a conversation, see earlier ones, reply live. `?source=` names where it is embedded                                                               |
| `/chat`                             | The chat on a page of its own, with the brand around it                                                                                                                     |
| `/help`                             | The public help center: collections, then `/help/{collection}` and `/help/{collection}/{article}`. `/help/search?q=` searches. `?embed=1` gives the form for a host's frame |
| `/help/preview/{id}`                | An article as it will look, for the team only                                                                                                                               |
| `/help/sitemap.xml`, `/robots.txt`  | The help center's pages for search engines, and what they may read                                                                                                          |
| `/dashboard`                        | The team's screens, behind one sign-in check. Redirects to the inbox                                                                                                        |
| `/dashboard/inbox`                  | The inbox: views (including tickets), conversations, the open one and its details. `?view=` and `?c=` are in the address                                                    |
| `/dashboard/settings`               | Settings: workspace pages admins change and agents read, Saved replies, which every agent adds to, and each person's own Profile and Notifications                          |
| `/dashboard/contacts`               | Everyone who has written: a searchable table, and one person's details and conversations                                                                                    |
| `/dashboard/visitors`               | Who is on the site now, refreshed every fifteen seconds, and one visitor's details, pages and a first message. `?visitor=` is in the address                                |
| `/dashboard/help`                   | The Help center section: collections, a table of articles to search and filter, and `/dashboard/help/{id}`, the editor                                                      |
| `/login`                            | Sign-in for team members. Sends a new install with no team to `/setup`                                                                                                      |
| `/setup`                            | The first-run wizard: the first admin, then brand, email and the widget with a live install check. Open only until the first admin finishes or skips it                     |
| `/widget.js`                        | The widget script, built from `packages/widget`                                                                                                                             |
| `/api/health`                       | Whether the app and the database answer, the newest migration against the one this build expects, and the build's version. 503 without the database                         |
| `GET /api/widget`                   | How the widget looks on a host site: position, colour, launcher icon. Readable from any origin. Records the site it was asked from, for the live install check              |
| `POST /api/conversations`           | Starts a conversation with its first message                                                                                                                                |
| `POST /api/conversations/{id}/read` | Marks a conversation as read for the caller's side                                                                                                                          |
| `POST /api/identify`                | Signs the chat in as one of the host product's users, from a token the install's identity adapter confirms                                                                  |
| `POST /api/unread`                  | How many replies a person has not read, from an app's own token or a Helpwren session, for a badge                                                                          |
| `POST /api/devices`                 | Registers a phone for pushes, from an app's own token or a Helpwren session                                                                                                 |
| `DELETE /api/devices`               | Stops pushes to a phone                                                                                                                                                     |
| `POST /api/jobs/push`               | Sends the pushes that are due, to contacts' phones and the team's browsers. Called every minute by the scheduler, with `CRON_SECRET`                                        |
| `POST /api/visitors`                | A browser checking in with its page. No session needed; answers whether a message from the team is waiting. 410 while tracking is off                                       |
| `POST /api/visitors/outreach`       | Takes up the team's waiting message for this browser, as a conversation of the caller's session                                                                             |
| `POST /api/visitors/{id}/outreach`  | A team member leaves a first message for a visitor. `DELETE` takes it back                                                                                                  |

## The design system

`@helpwren/design-system` has four component layers plus tokens and illustrations. Each layer may
import only from the ones before it.

| Layer    | Holds                                             | Decision record                            |
| -------- | ------------------------------------------------- | ------------------------------------------ |
| `ui`     | shadcn/ui output, kept close to upstream          | [0002](decisions/0002-component-layers.md) |
| `base`   | Our primitives: buttons, inputs, tables, overlays | [0002](decisions/0002-component-layers.md) |
| `shared` | Composed pieces: empty states, message bubbles    | [0002](decisions/0002-component-layers.md) |
| `data`   | Components that fetch through TanStack Query      | [0004](decisions/0004-data-layer.md)       |
| `form`   | Components that build forms on React Hook Form    | [0005](decisions/0005-form-layer.md)       |

`data` and `form` sit side by side above `shared`. Tokens are described in
[ADR 0003](decisions/0003-design-tokens.md). See [design-system.md](design-system.md) for every
component and when to use it.

## Quality gates

Every package exposes the same scripts where they apply: `lint`, `typecheck`, `test` and `build`.
Turborepo runs them across the workspace and caches the results. CI runs the Prettier check and
then all four.

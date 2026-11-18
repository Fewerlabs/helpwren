# Architecture

This page describes how the code is organised. For what Helpwren is, see the
[README](../README.md).

## Monorepo

pnpm workspaces with Turborepo. Apps are in `apps/`, libraries in `packages/`.

| Workspace                | Role                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `apps/web`               | The one Next.js app: `/embed`, `/help`, `/dashboard`, `/api`      |
| `packages/design-system` | Tokens, components and illustrations                              |
| `packages/core`          | Headless client library                                           |
| `packages/widget`        | The script a site loads to show the chat, published as `helpwren` |
| `packages/react-native`  | React Native support screen (stub)                                |
| `packages/adapters`      | Identity, push, email and storage adapters (stub)                 |
| `packages/cli`           | Installer and upgrader (stub)                                     |
| `packages/config`        | Shared TypeScript, ESLint and Prettier configuration              |

Internal packages are consumed as TypeScript source: their `exports` point at `src`, and the app
compiles them (`transpilePackages`). There is no per-package build step until a package is
published. See [ADR 0001](decisions/0001-tooling.md).

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
[Setup](contributing/setup.md#local-database) for the commands.

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
admin (`src/features/settings/server/team.ts`). See
[ADR 0010](decisions/0010-dashboard-and-settings.md).

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

### The widget

A site shows the chat by loading `/widget.js`, which the app builds from `packages/widget` when
it starts. The script draws a launcher and opens `/embed` in a frame; the two talk with
`postMessage`. `src/features/chat/hooks/use-embed-bridge.ts` is the chat's end of that, and
`src/proxy.ts` sets which sites may frame it. See [ADR 0009](decisions/0009-widget.md).

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
  Prefer `QueryList` and `QueryDetail` from the design system over calling `useQuery` yourself:
  they draw the loading, empty and error states.
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

| Route                               | What it is                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/design`                           | The design system running in the app, with the example feature at the bottom                                  |
| `/embed`                            | The visitor's chat: start a conversation, see earlier ones, reply live. `?source=` names where it is embedded |
| `/help`                             | The public help center (placeholder)                                                                          |
| `/dashboard`                        | The team's screens, behind one sign-in check. Redirects to the inbox                                          |
| `/dashboard/inbox`                  | The inbox: conversations, the open one, and details, in three panels. `?c=` is the open conversation          |
| `/dashboard/settings`               | Settings: General, Installation and Team. Admins change them; agents read                                     |
| `/dashboard/contacts`               | Everyone who has written: a searchable table, and one person's details and conversations                      |
| `/dashboard/help`                   | Planned; it says what is coming                                                                               |
| `/login`                            | Sign-in for team members                                                                                      |
| `/widget.js`                        | The widget script, built from `packages/widget`                                                               |
| `/api/health`                       | Returns `{ "status": "ok" }`                                                                                  |
| `POST /api/conversations`           | Starts a conversation with its first message                                                                  |
| `POST /api/conversations/{id}/read` | Marks a conversation as read for the caller's side                                                            |

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

# Architecture

This page describes how the code is organised. For what Helpwren is, see the
[README](../README.md).

## Monorepo

pnpm workspaces with Turborepo. Apps are in `apps/`, libraries in `packages/`.

| Workspace                | Role                                                     |
| ------------------------ | -------------------------------------------------------- |
| `apps/web`               | The one Next.js app: `/embed`, `/help`, `/inbox`, `/api` |
| `packages/design-system` | Tokens, components and illustrations                     |
| `packages/core`          | Headless client library                                  |
| `packages/widget`        | Embeddable script, published as `helpwren` (stub)        |
| `packages/react-native`  | React Native support screen (stub)                       |
| `packages/adapters`      | Identity, push, email and storage adapters (stub)        |
| `packages/cli`           | Installer and upgrader (stub)                            |
| `packages/config`        | Shared TypeScript, ESLint and Prettier configuration     |

Internal packages are consumed as TypeScript source: their `exports` point at `src`, and the app
compiles them (`transpilePackages`). There is no per-package build step until a package is
published. See [ADR 0001](decisions/0001-tooling.md).

## The database: `supabase/`

Helpwren runs on Supabase: Postgres, Auth, Realtime and Storage.

| Path                   | Holds                                                           |
| ---------------------- | --------------------------------------------------------------- |
| `supabase/config.toml` | Settings for the local stack the Supabase CLI runs in Docker    |
| `supabase/migrations`  | Tables, access rules and triggers, as plain SQL in order        |
| `supabase/tests`       | pgTAP tests of the access rules, one file per table             |
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

| Route         | What it is                                                                   |
| ------------- | ---------------------------------------------------------------------------- |
| `/design`     | The design system running in the app, with the example feature at the bottom |
| `/embed`      | Chat, tickets and help for visitors and users (placeholder)                  |
| `/help`       | The public help center (placeholder)                                         |
| `/inbox`      | The agent inbox (placeholder)                                                |
| `/api/health` | Returns `{ "status": "ok" }`                                                 |

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

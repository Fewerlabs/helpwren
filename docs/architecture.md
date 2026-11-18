# Architecture

This page describes how the code is organised. For what Helpwren does and why, read the
[build plan](helpwren-build-plan.md).

## Monorepo

pnpm workspaces with Turborepo. Apps are in `apps/`, libraries in `packages/`.

| Workspace                | Role                                                     |
| ------------------------ | -------------------------------------------------------- |
| `apps/web`               | The one Next.js app: `/embed`, `/help`, `/inbox`, `/api` |
| `packages/design-system` | Tokens, components and illustrations                     |
| `packages/core`          | Headless client library (stub)                           |
| `packages/widget`        | Embeddable script, published as `helpwren` (stub)        |
| `packages/react-native`  | React Native support screen (stub)                       |
| `packages/adapters`      | Identity, push, email and storage adapters (stub)        |
| `packages/cli`           | Installer and upgrader (stub)                            |
| `packages/config`        | Shared TypeScript, ESLint and Prettier configuration     |

Internal packages are consumed as TypeScript source: their `exports` point at `src`, and the app
compiles them (`transpilePackages`). There is no per-package build step until a package is
published. See [ADR 0001](decisions/0001-tooling.md).

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

The feature folder convention (components, hooks, store, schemas, api, and a public `index.ts`)
is documented here once the example feature is built.

## The design system

See [design-system.md](design-system.md) and
[ADR 0002](decisions/0002-component-layers.md) for the three component layers.

## Quality gates

Every package exposes the same scripts where they apply: `lint`, `typecheck`, `test` and `build`.
Turborepo runs them across the workspace and caches the results. CI runs the Prettier check and
then all four.

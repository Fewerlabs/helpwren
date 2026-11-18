# Setup

## Requirements

- **Node 26** (the current LTS). The version is pinned in `.nvmrc`; run `nvm use` or the
  equivalent for your version manager.
- **pnpm 12.** The exact version is pinned in the root `package.json` (`packageManager`). Install
  it with `npm install --global pnpm@12`, or follow the
  [pnpm installation guide](https://pnpm.io/installation).
- **Docker**, for the local database. [Docker Desktop](https://docs.docker.com/desktop/) is the
  easiest option on macOS and Windows; any Docker-compatible runtime works. It must be running
  whenever you use the `db:` commands below.

## Install

```bash
pnpm install
pnpm exec playwright install chromium
```

Chromium is used to run Storybook stories as tests. It is a one-time download.

## Environment variables

The app needs to know where its Supabase project is. With the local database running, this
writes `apps/web/.env.local` for you:

```bash
pnpm db:env
```

To point at another project, copy `.env.example` to `apps/web/.env.local` and fill it in. Every
variable is validated at startup by the Zod schema in `apps/web/src/lib/env.ts`.

## Run

```bash
pnpm dev          # http://localhost:3000
pnpm storybook    # http://localhost:6006
```

## Local database

Helpwren runs on Supabase. The Supabase CLI is a dev dependency, so `pnpm install` brings it, and
it runs the whole stack (Postgres, Auth, Realtime, Storage and a test mailbox) in Docker on your
machine. No Supabase account is needed for development.

```bash
pnpm db:start     # start the stack; the first run downloads the images and takes a while
pnpm db:status    # print the local URLs and keys
pnpm db:reset     # rebuild the database from supabase/migrations and the seed data
pnpm db:stop      # stop the stack and keep its data
pnpm db:env       # write apps/web/.env.local for the local stack
pnpm db:test      # run the access-rule tests in supabase/tests
pnpm test:db      # run the tests that need the database, such as the client library's
pnpm test:e2e     # run the browser tests in apps/web/e2e against the local stack
pnpm db:lint      # check the schema for mistakes
pnpm db:types     # regenerate packages/core/src/database.types.ts after a schema change
```

`pnpm db:reset` loads demo data from `supabase/seed.sql`: two team members (`ada@example.com`, an
admin, and `sam@example.com`), a few contacts and some conversations.

### Signing in to the inbox

Open http://localhost:3000/inbox and enter one of the demo emails. The six-digit code arrives in
Mailpit, the local test mailbox, at http://127.0.0.1:54324. To add yourself:

```bash
pnpm agent:invite you@example.com --name "Your Name" --admin
```

`pnpm db:status` also prints the address of Supabase Studio, a browser interface for the local
database, and of Mailpit, which catches every email the local stack sends. Local settings live in
`supabase/config.toml`.

## Check your work

```bash
pnpm check
```

This runs the Prettier check, then lint, typecheck, tests and build through Turborepo, which is
what CI runs. Turborepo caches results, so unchanged packages are skipped.

To work on one package:

```bash
pnpm --filter @helpwren/design-system test
pnpm --filter @helpwren/web lint
```

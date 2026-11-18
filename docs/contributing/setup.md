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

The app runs without any. To override a default, copy `.env.example` to `apps/web/.env.local`.
Every variable is validated at startup by the Zod schema in `apps/web/src/lib/env.ts`.

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

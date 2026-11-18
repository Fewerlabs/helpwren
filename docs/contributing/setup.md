# Setup

## Requirements

- **Node 26** (the current LTS). The version is pinned in `.nvmrc`; run `nvm use` or the
  equivalent for your version manager.
- **pnpm 12.** The exact version is pinned in the root `package.json` (`packageManager`). Install
  it with `npm install --global pnpm@12`, or follow the
  [pnpm installation guide](https://pnpm.io/installation).

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

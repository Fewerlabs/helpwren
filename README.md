# Helpwren

Open-source, self-hosted live chat, help desk and knowledge base that any product can plug in.
Published by [Fewer Labs](https://helpwren.fewerlabs.dev).

> **Status: pre-alpha.** The repository, the tooling and the design system are in place. There is
> no working chat, inbox or help center yet, and nothing is published to npm.

## What it will be

- **Live chat and tickets** between a product's support team and its visitors and users.
- **A knowledge base** with search and contextual help, built to rank in search engines.
- **An agent inbox.**
- **Self-hosted:** one install per product, in your own database, with no per-agent pricing.
- **Layered:** use the drop-in widget, restyle it, or build your own interface on the same client
  library and API.

## Quick start for contributors

You need Node 26 (see `.nvmrc`), pnpm 12 and Docker, for the local database.

```bash
pnpm install
pnpm exec playwright install chromium   # once, for the Storybook story tests
pnpm db:start                           # the local Supabase stack, in Docker
pnpm dev                                # the app on http://localhost:3000
pnpm storybook                          # the design system on http://localhost:6006
```

Before opening a pull request:

```bash
pnpm check    # format check, lint, typecheck, tests and build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions.

## What is here today

- **A design system** (`packages/design-system`): design tokens for light and dark, more than
  thirty components, the wren illustrations, and components for data fetching and forms. Browse it
  with `pnpm storybook`.
- **The app shell** (`apps/web`): a Next.js app with placeholder routes, and `/design`, which shows
  the design system running in the app together with a worked example feature.
- **Documented stubs** for the product packages: the client library, the widget, the React Native
  screen, the adapters and the installer.

## Repository layout

```
apps/
  web/                 Next.js app: /embed, /help, /inbox, /api (placeholder routes for now)
packages/
  design-system/       Tokens, components and illustrations
  core/                Headless client library (stub)
  widget/              Embeddable script, published as `helpwren` (stub)
  react-native/        React Native support screen (stub)
  adapters/            Identity, push, email and storage adapters (stub)
  cli/                 Installer and upgrader (stub)
  config/              Shared TypeScript, ESLint and Prettier configuration
supabase/              Local Supabase configuration; migrations and database tests come next
docs/
  brand/               Brand boards: logo, colour palette, illustrations
  decisions/           Architecture decision records
  contributing/        Setup, conventions and the release process
  architecture.md
  design-system.md
```

## Documentation

- [Architecture and code conventions](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Decision records](docs/decisions/)

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)

## Licence

[MIT](LICENSE).

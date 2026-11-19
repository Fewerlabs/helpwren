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

## Install it

Supabase Cloud and Vercel (recommended), about ten minutes:

```bash
git clone https://github.com/Fewerlabs/helpwren.git && cd helpwren
pnpm install
pnpm helpwren install        # asks for your Supabase project, writes the env file, migrates
```

Then deploy `apps/web`, or use the button, and open `/setup` to create the first admin.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFewerlabs%2Fhelpwren&root-directory=apps%2Fweb&project-name=helpwren&repository-name=helpwren&env=NEXT_PUBLIC_APP_URL%2CCRON_SECRET&envDescription=Your%20install%20address%2C%20and%20a%20long%20random%20secret%20for%20the%20scheduled%20jobs%20%28openssl%20rand%20-hex%2032%29.&envLink=https%3A%2F%2Fgithub.com%2FFewerlabs%2Fhelpwren%2Fblob%2Fmain%2Fdocs%2Finstall.md%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D)

Or everything on your own server with Docker Compose, beside Supabase's own self-hosting stack:
`pnpm helpwren install --mode docker`. [docs/install.md](docs/install.md) covers both, step by
step, with upgrades, rolling back and troubleshooting.

## Quick start for contributors

You need Node 26 (see `.nvmrc`), pnpm 12 and Docker, for the local database.

```bash
pnpm install
pnpm exec playwright install chromium   # once, for the Storybook story tests
pnpm db:start                           # the local Supabase stack, in Docker
pnpm db:env                             # once: point the app at the local stack
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
- **The app** (`apps/web`): a Next.js app with the visitor's chat at `/embed`, the team's inbox
  at `/dashboard`, placeholder routes for the rest, and `/design`, which shows the design system running in the app together
  with a worked example feature.
- **The database** (`supabase/`): the first tables, the rules for who can read and write each
  row, and tests that prove them.
- **The start of the client library** (`packages/core`): sign-in for team members and settings.
- **The widget** (`packages/widget`): the script a site loads to show the chat. Try it with
  `examples/plain-html`.
- **The installer** (`packages/cli`): `pnpm helpwren install` and `upgrade`, for Supabase Cloud
  or Docker, and the first-run setup wizard at `/setup`.

## Repository layout

```
apps/
  web/                 Next.js app: /embed, /help, /dashboard, /api
packages/
  design-system/       Tokens, components and illustrations
  core/                Headless client library
  widget/              The script a site loads to show the chat, published as `helpwren`
  react-native/        React Native support screen (stub)
  adapters/            Identity, push, email and storage adapters (stub)
  cli/                 Installer and upgrader: pnpm helpwren install, pnpm helpwren upgrade
  config/              Shared TypeScript, ESLint and Prettier configuration
supabase/              Database migrations, access-rule tests, demo data and local configuration
deploy/docker/         Docker Compose for a fully self-hosted install
examples/              Small sites that use Helpwren the way an adopter would
docs/
  brand/               Brand boards: logo, colour palette, illustrations
  decisions/           Architecture decision records
  contributing/        Setup, conventions and the release process
  architecture.md
  design-system.md
```

## Documentation

- [Installing Helpwren](docs/install.md)
- [Architecture and code conventions](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Decision records](docs/decisions/)

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)

## Licence

[MIT](LICENSE).

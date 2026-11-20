# Helpwren

Open-source, self-hosted live chat, tickets and a help center that plug into any product.
Published by [Fewer Labs](https://helpwren.fewerlabs.dev).

Each product runs its own copy, on its own address and in its own database. There is no
per-seat pricing, and the code is MIT licensed.

## Features

- **Live chat** for visitors and logged-in users, with attachments, typing indicators, online
  status and a rating at the end of a conversation.
- **Tickets**: a conversation with a number, status, priority and assignee, plus internal notes
  only the team can see.
- **An inbox** for the team, with views, search, contacts, saved replies and live visitors.
- **A help center** with collections, articles and search, built to rank in search engines and
  embeddable in your own site. Featured articles show on the chat's home screen.
- **A widget** loaded by one snippet. It knows who is asking when you call `identify`, or verify
  users with a signed token so their history follows them across devices. `setContext` tells the
  team which page they wrote from.
- **A mobile screen** for React Native and Expo apps, with an unread badge.
- **Push notifications** through Expo, Firebase or a webhook to your own backend.
- **Email**: notifications through SMTP or Resend, and replies by email that land back in the
  same conversation.
- **Light and dark themes**, and your own brand colour and logo.

## How it fits together

```
your site ── <script src=".../widget.js"> ──▶  Helpwren (Next.js)  ──▶  your Supabase
your app  ── SupportScreen (React Native) ──▶   /embed  chat           Postgres, Realtime,
                                                 /help   help center    Storage, Auth
                                                 /dashboard  inbox
```

## Install

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

Once it runs, Settings → Installation shows the snippet with your address filled in. Paste it into
your site:

```html
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ source: "web" });
</script>
```

Guest chat works from here. Everything after this is optional: identity, the mobile screen, push
and email.

## Packages

| Package                                                                          | For                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------ |
| [`helpwren`](https://www.npmjs.com/package/helpwren)                             | The widget, for an app that bundles its own code |
| [`@helpwren/react-native`](https://www.npmjs.com/package/@helpwren/react-native) | The support screen for React Native and Expo     |

A site with a script tag needs neither: each install serves the widget itself.

## Documentation

- [Installing Helpwren](docs/install.md): Supabase Cloud and Vercel, or Docker; upgrades
- [The widget on your site](docs/widget.md): options, methods, events and logged-in users
- [Helpwren in a mobile app](docs/mobile.md): React Native, Expo and push
- [Setup](docs/contributing/setup.md): local development, email and replies by email
- [Architecture](docs/architecture.md) and [decision records](docs/decisions/)
- [Design system](docs/design-system.md)

## Develop locally

You need Node 26 (see `.nvmrc`), pnpm 12 and Docker, for the local database.

```bash
pnpm install
pnpm exec playwright install chromium   # once, for the Storybook story tests
pnpm db:start                           # the local Supabase stack, in Docker
pnpm db:env                             # once: point the app at the local stack
pnpm dev                                # the app on http://localhost:3000
pnpm storybook                          # the design system on http://localhost:6006
```

`pnpm db:reset` loads demo data. Before opening a pull request, run `pnpm check` (format check,
lint, typecheck, tests and build).

## Repository layout

```
apps/
  web/                 Next.js app: /embed, /help, /dashboard, /api
  site/                The project website, helpwren.fewerlabs.dev
packages/
  design-system/       Tokens, components and illustrations
  core/                Client library
  widget/              The script a site loads to show the chat
  react-native/        React Native support screen
  adapters/            Identity, push and email adapters
  cli/                 Installer and upgrader: pnpm helpwren install, pnpm helpwren upgrade
  config/              Shared TypeScript, ESLint and Prettier configuration
supabase/              Migrations, access-rule tests, demo data and local configuration
deploy/docker/         Docker Compose for a fully self-hosted install
examples/              Small sites that use Helpwren the way an adopter would
docs/                  Guides, architecture and decision records
```

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)

## Licence

[MIT](LICENSE).

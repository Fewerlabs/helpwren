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

You need a [Supabase](https://supabase.com) project (the free plan works for a start) and a host
for a Next.js app, such as Vercel.

1. **Database.** Link the Supabase CLI to your project and apply the migrations:

   ```bash
   pnpm install
   pnpm exec supabase link --project-ref <your-project-ref>
   pnpm exec supabase db push
   ```

2. **App.** Deploy `apps/web` with the environment variables in [`.env.example`](.env.example).
   Three are required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SUPABASE_SECRET_KEY`. Set `NEXT_PUBLIC_APP_URL` to the app's address.

3. **First admin.** With `apps/web/.env.local` pointing at your project:

   ```bash
   pnpm agent:invite you@example.com --name "Your Name" --admin
   ```

   Sign in at `/dashboard` with the code that arrives by email.

4. **Snippet.** Settings → Installation shows the snippet with your address filled in. Paste it
   into your site:

   ```html
   <script src="https://support.example.com/widget.js"></script>
   <script>
     Helpwren.init({ source: "web" });
   </script>
   ```

   Guest chat works from here. Everything after this is optional: identity, the mobile screen,
   push and email.

## Documentation

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
  cli/                 Installer and upgrader
  config/              Shared TypeScript, ESLint and Prettier configuration
supabase/              Migrations, access-rule tests, demo data and local configuration
examples/              Small sites that use Helpwren the way an adopter would
docs/                  Guides, architecture and decision records
```

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)

## Licence

[MIT](LICENSE).

# Next.js example: Glown

A small Next.js App Router app that plays the part of Glown, Helpwren's first real install. It
has the two web surfaces Glown has, on two hostnames of one site:

| Hostname                   | Stands in for  | Helpwren on it                                                                       |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `www.glown.localhost:4300` | `glown.io`     | The install's `widget.js` with `next/script`, guest chat, the help center at `/help` |
| `app.glown.localhost:4300` | `app.glown.io` | The `helpwren` package (`createWidget`), with the logged-in user's JWT               |

Browsers send every `*.localhost` name to this machine, so there is nothing to set up for the
hostnames. They are the same site (`glown.localhost`), as `glown.io` and `app.glown.io` are,
which is what lets a guest's chat on the public site carry over when they log in on the app.

## What is where

**Public site** (`src/app/site`)

- `/`: the widget from the install's snippet. Anyone can write.
- `/pricing`: "Ask about Pro" calls `startConversation(draft)`, which puts words in the message
  box and sends nothing.
- `/business`: `init({ launcher: false })` and the page's own Help button, which calls `show()`.
- `/help`: the install's help center, through one rewrite in `next.config.ts`:
  `/help/:path*` to the install's `/help/:path*`.

**Web app** (`src/app/webapp`)

- `/login` and `/signup`: a fake login over accounts kept in memory (`src/lib/users.ts`).
  `amara@glown.test` with `glown-demo` is always there; `blocked@glown.test` with the same
  password logs in, but Glown's API refuses its token.
- The login issues a JWT the way Glown's API does (HS256, `userId`, `type`, `email`, a short
  life) and keeps it, with a refresh token, in `httpOnly` cookies. `/api/auth/token` hands the
  page a current one, refreshing it when it has run out.
- `/api/me` is Glown's "who am I" address: it answers `{ status, message, data }` for a good
  token, 401 for a bad or expired one, and 403 for a blocked account. The install calls it with
  the token the page handed over (the profile endpoint option).
- The layout calls `identify({ token: () => getToken() })` with a function, so the widget can
  ask for a fresh token whenever it needs one; each page calls
  `setContext({ businessId, plan, page })`; Log out calls `reset()`; and the header's Help
  button shows the count from `on("unread")`.
- `/support` shows the help center inside the page (`/help?embed=1`).

## Run it against a local install

1. Start the install as usual (`pnpm dev` at the repository's root, or
   `pnpm --filter @helpwren/web dev --port 3000`).
2. Start the example, pointed at the install:

   ```bash
   NEXT_PUBLIC_HELPWREN_URL=http://localhost:3000 pnpm --filter @helpwren/example-nextjs dev
   ```

   It serves on port 4300; set `PORT` for another. Open http://www.glown.localhost:4300 and
   http://app.glown.localhost:4300.

3. Set the install up for Glown in the dashboard, as an admin:
   - **Settings > Installation > Domains**: `www.glown.localhost:4300` and
     `app.glown.localhost:4300`. Any other site is then refused the chat.
   - **Settings > Branding > Help center > Public address**:
     `http://www.glown.localhost:4300/help`. Links, canonical addresses and the sitemap then
     use the public site's address.
   - **Settings > Identity**: choose "Your product's profile endpoint". Profile address
     `http://127.0.0.1:4300/api/me` (the install calls it from its server, and only allows
     plain HTTP to this machine). User id `data.id`; Name `data.firstName, data.lastName`;
     Email `data.email`; Organisation id and name `data.business.id` and `data.business.name`;
     Audience `data.type`, with Audience values `Business = business`; Shown to your team
     `Plan = data.business.plan`. "Test token" takes a token from
     http://app.glown.localhost:4300/api/auth/token while logged in.

| Variable                    | Default                               | What it is                                        |
| --------------------------- | ------------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_HELPWREN_URL`  | `http://localhost:3000`               | The install                                       |
| `PORT`                      | `4300`                                | The example's port                                |
| `GLOWN_JWT_SECRET`          | a fixed development value             | What the fake API signs its tokens with           |
| `JWT_EXPIRATION_IN_SECONDS` | `900`                                 | How long an access token lasts, as in Glown's API |
| `GLOWN_ASSETS_DIR`          | `~/Documents/code/glown/glown assets` | Glown's brand files, if you have them (see below) |

## Glown's logo and pictures

Glown's logo, favicons and cover pictures are its trademarks and are not in this repository.
`scripts/copy-brand.mjs` runs before `dev` and `build` and copies them from `GLOWN_ASSETS_DIR`
into `public/brand`, which git ignores. Without that folder the example shows a plain text
"Glown" and works the same.

## The tests

`apps/web/e2e/glown` drives this example against the install, with the install set up as above
for the length of each file and put back afterwards. The Playwright config starts the example
beside the install, so they run with the rest:

```bash
pnpm test:e2e                                    # everything
pnpm --filter @helpwren/web exec playwright test e2e/glown
```

`E2E_PORT` and `EXAMPLE_PORT` move the install and the example off ports 3000 and 4300. With
`E2E_PORT`, the install's `NEXT_PUBLIC_APP_URL` in `apps/web/.env.local` must use the same port.

Not covered here: contextual help ("Help for this page" from rules or a page filter), which the
install does not have yet; Safari, whose storage partitioning may keep the guest's chat from
carrying over between hostnames; the mobile apps (push, the WebView screen, `GET /api/unread`);
and real domains over HTTPS.

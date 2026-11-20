# Installing Helpwren

Helpwren runs in two supported ways. Pick one:

|                          | **Supabase Cloud + a Node host** (recommended)  | **Fully self-hosted with Docker**                                   |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| Where the data lives     | A Supabase project you own                      | Your own server, in Docker volumes                                  |
| Where the app runs       | Vercel, or any host that runs Node 26           | The same server, in a container                                     |
| You look after           | Almost nothing; Supabase backs up on paid plans | Postgres, backups, updates and TLS                                  |
| Time to a working chat   | About 10 minutes                                | About 20 minutes, most of it Docker pulling images                  |
| Machine you install from | Node 26, pnpm 12                                | A Linux server with Docker, Compose 2.20+, Git, Node 26 and pnpm 12 |

Either way, the last step is the same: open `/setup` in the browser and the wizard creates the
first admin. [ADR 0024](decisions/0024-installer-and-setup-wizard.md) explains why it works
this way.

- [The quick way: Supabase Cloud and Vercel](#supabase-cloud-and-a-node-host)
- [Fully self-hosted with Docker Compose](#fully-self-hosted-with-docker-compose)
- [The setup wizard](#the-setup-wizard)
- [Upgrading](#upgrading) and [rolling back](#rolling-back)
- [Troubleshooting](#troubleshooting)

## Supabase Cloud and a Node host

Measured on a fresh checkout (see [How long it takes](#how-long-it-takes)): the commands take
about a minute; the rest is clicking through Supabase and Vercel.

### 1. Create a Supabase project (2 minutes)

1. At [supabase.com/dashboard](https://supabase.com/dashboard), create a project. Note the
   database password you choose.
2. Wait for it to finish setting up, then open **Project Settings → API Keys** and keep the tab
   open: you need the **Project URL**, the **publishable key** (`sb_publishable_…`) and a
   **secret key** (`sb_secret_…`).
3. Open **Connect** (top of the dashboard) and copy the **Session pooler** connection string,
   with your database password in it. The installer uses it only to apply the migrations.

### 2. Run the installer (1 minute)

```bash
git clone https://github.com/Fewerlabs/helpwren.git && cd helpwren
pnpm install
pnpm helpwren install
```

It checks Node, pnpm and the Supabase CLI (a dev dependency, so `pnpm install` brings it), asks
how you will run Helpwren, then asks for the values above. It:

- writes `apps/web/.env.local` with your answers and a fresh `CRON_SECRET`, readable only by
  you, and never prints a secret back;
- applies the database migrations with `supabase db push`
  ([docs](https://supabase.com/docs/reference/cli/supabase-db-push)). It never loads the demo
  data unless you say yes, and never resets anything;
- with `--access-token` (a [personal access token](https://supabase.com/dashboard/account/tokens)),
  sets the three Auth settings below through the
  [Management API](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
  Without it, it lists them for you to set by hand.

To leave the connection string out, the installer can run `supabase link` instead, which signs
you in to Supabase in the browser.

**For CI or scripts**, give everything as flags or environment variables and add `--yes`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcd.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
SUPABASE_SECRET_KEY=sb_secret_... \
SUPABASE_DB_URL='postgresql://postgres.abcd:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
SUPABASE_ACCESS_TOKEN=sbp_... \
pnpm helpwren install --yes --mode cloud --app-url https://support.example.com
```

`pnpm helpwren --help` lists every option.

### 3. Three Auth settings (1 minute, by hand only without `--access-token`)

In the Supabase dashboard:

1. **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**. Visitors chat
   as anonymous users; without this the chat cannot start.
2. **Authentication → Emails → Magic link**: set the subject to `Your Helpwren sign-in code` and
   paste [`supabase/templates/sign-in-code.html`](../supabase/templates/sign-in-code.html) as
   the body. Team members sign in with the six-digit code it shows.
3. **Authentication → URL Configuration**: set the **Site URL** to your install's address.

Supabase's built-in email only reaches the addresses of your Supabase organisation's members,
a few times an hour. That is enough for the first admin if you use your own address. To sign in
anyone else, set up **Authentication → Emails → SMTP Settings**
([guide](https://supabase.com/docs/guides/auth/auth-smtp)).

### 4. Deploy the app (3 minutes)

#### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFewerlabs%2Fhelpwren&root-directory=apps%2Fweb&project-name=helpwren&repository-name=helpwren&env=NEXT_PUBLIC_APP_URL%2CCRON_SECRET&envDescription=Your%20install%20address%2C%20and%20a%20long%20random%20secret%20for%20the%20scheduled%20jobs%20%28openssl%20rand%20-hex%2032%29.&envLink=https%3A%2F%2Fgithub.com%2FFewerlabs%2Fhelpwren%2Fblob%2Fmain%2Fdocs%2Finstall.md%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D)

The button copies the repository to your Git account, sets the project's **Root Directory** to
`apps/web` and offers to connect a Supabase project through the
[Supabase integration](https://supabase.com/docs/guides/integrations/vercel-marketplace), which
fills in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY` for you. You add two:

| Variable              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | The address people will use, such as `https://support.example.com`     |
| `CRON_SECRET`         | `openssl rand -hex 32`, or the one the installer wrote to `.env.local` |

The deploy does not touch the database. Run step 2 with the same project (Vercel lists its
`POSTGRES_URL_NON_POOLING` under **Settings → Environment Variables**; it works as
`--db-url`), then step 3. Without a connected integration, add all five variables by hand from
`apps/web/.env.local`. The full list is in [`.env.example`](../.env.example).

Vercel Cron Jobs call routes with `GET` and, on the Hobby plan, at most once a day, so the
scheduled jobs need another scheduler; see [step 5](#5-the-scheduled-jobs-2-minutes).

#### Any other Node host

```bash
pnpm build
pnpm --filter @helpwren/web start          # serves on port 3000; PORT=8080 to change it
```

Give the host the variables from `apps/web/.env.local`. `NEXT_PUBLIC_` values are written into
the browser's code at build time, so build where those variables are set.

### 5. The scheduled jobs (2 minutes)

Emails about unread replies and ticket changes, and pushes to phones, are sent by two jobs that
something must call every minute with `CRON_SECRET`:

```bash
curl -X POST https://support.example.com/api/jobs/email -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://support.example.com/api/jobs/push -H "Authorization: Bearer $CRON_SECRET"
```

Any scheduler works: the host's cron, a GitHub Actions schedule, an uptime pinger, or the
database itself with `pg_cron`. [Setup](contributing/setup.md#sending-what-is-due) has the SQL.
On Supabase's free plan these calls also keep the project from being paused.

### 6. Open `/setup`

Go to `https://support.example.com/setup` and follow [the wizard](#the-setup-wizard).

## Fully self-hosted with Docker Compose

Everything on one server: Helpwren, Supabase's own self-hosting stack, and a small scheduler
container that calls the jobs every minute. Supabase is not reinvented here:
`deploy/docker/docker-compose.yml` **includes Supabase's official Compose file**
([docs](https://supabase.com/docs/guides/self-hosting/docker)), fetched unchanged at a pinned
release (`self-hosted/v0.8.4`) into `deploy/docker/supabase`.
[`deploy/docker/supabase-overrides.yml`](../deploy/docker/supabase-overrides.yml) adds the few
settings Helpwren needs on top: the sign-in code email, named volumes for the database and
uploads, and an optional test mailbox.

Supabase's stack is about a dozen containers, about 1.5 GB of memory together with Helpwren
once running; a server with 4 GB or more is comfortable. Check Supabase's guide for its current
requirements.

### Install (10 to 20 minutes, most of it pulling images)

```bash
git clone https://github.com/Fewerlabs/helpwren.git && cd helpwren
pnpm install
pnpm helpwren install --mode docker
```

The installer:

1. checks Docker is running, Compose is 2.20 or later (for `include`), and Git;
2. fetches Supabase's `docker/` folder at the pinned release (a sparse Git checkout);
3. writes `deploy/docker/.env` from Supabase's `.env.example`, replacing **every** published
   example secret with a fresh one (`POSTGRES_PASSWORD`, `JWT_SECRET`, the API keys signed with
   it, the dashboard password and the rest), and adds Helpwren's own: `HELPWREN_APP_URL` and
   `CRON_SECRET`. Values you have already set are kept;
4. asks whether to catch sign-in emails in a local test mailbox (Mailpit, at
   http://localhost:8025; Auth sends to it without signing in, since it is a plain connection). Say yes to try it out; for real use, set `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_USER`, `SMTP_PASS` and `SMTP_ADMIN_EMAIL` in `.env` to a real mail service;
5. starts the database, applies the migrations through Supabase's pooler, then builds the
   Helpwren image and starts everything with `docker compose up --wait`.

`--no-start` writes the files and stops, so you can review `.env` first.

| What                 | Where                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Helpwren             | http://localhost:3000 (`HELPWREN_PORT` to change)                  |
| Supabase API, Studio | http://localhost:8000 (user and password: `DASHBOARD_*` in `.env`) |
| Test mailbox         | http://localhost:8025, when chosen                                 |
| Database volume      | `helpwren_db-data`; uploads in `helpwren_storage-data`             |

**On a real domain**, put a reverse proxy with TLS in front of ports 3000 and 8000 (Supabase's
docs cover [Caddy and nginx](https://supabase.com/docs/guides/self-hosting/docker)), and give the
installer the public addresses: `--app-url https://support.example.com --supabase-url
https://api.support.example.com`. The app reaches Supabase over the private Docker network
(`SUPABASE_INTERNAL_URL=http://kong:8000`), so it works whether or not the public address
resolves from inside a container.

**Email from Helpwren itself** (reply notifications) is separate from Supabase Auth's: set
`EMAIL_PROVIDER` and `HELPWREN_SMTP_URL` (or `RESEND_API_KEY`) in `.env`, then
`docker compose up --detach helpwren`.

### The pieces, if you want to run them yourself

```bash
cd deploy/docker
docker compose config --quiet          # check the configuration
docker compose up --detach --build     # start or update everything
docker compose logs --follow helpwren scheduler
```

The image is built from [`apps/web/Dockerfile`](../apps/web/Dockerfile): a multi-stage build on
`node:26-alpine` that ships only Next's standalone server, runs as the unprivileged `node` user,
and reports its health from `/api/health`.

## The setup wizard

`/setup` opens on an install with nobody on its team; `/login` and `/dashboard` send you there.

1. **Create the first admin**: your name and email. Helpwren emails a six-digit code to sign you
   in; there are no passwords. Supabase Auth sends it (see step 3 above for Supabase Cloud's
   limits; on the local stack it lands in Mailpit). If it does not arrive, "Send a new code"
   says why Supabase refused.
2. **Brand**: name, logo and colour.
3. **Email**: whether a provider is set up, and the from address, with a test email.
4. **Install the widget**: the snippet to copy, and a live check that turns green, "Seen on
   example.com just now", as soon as the widget loads on a real site.
5. **Done**: links to the inbox, the help center and these docs.

Each step can be skipped and done later in Settings. Only the very first admin can be created
here: the database makes it under a lock, so two people setting up at the same moment cannot
both win, and once anyone is on the team `/setup` only offers to sign in, then closes for good.
Until you create that admin, anyone who can reach `/setup` could, so do it straight after
deploying. `pnpm agent:invite you@example.com --name "You" --admin` still works from the
command line instead.

## The help center on your own site

The help center lives at `/help` on your install. To show it at `/help` on your main site
instead, which is better for search, pass that path on to the install with one rewrite. In a
Next.js site:

```js
// next.config.js
async rewrites() {
  return [{ source: "/help/:path*", destination: "https://support.example.com/help/:path*" }];
}
```

Then set **Settings > Branding > Help center > Public address** to `https://example.com/help`.
Links, canonical addresses and the sitemap (`/help/sitemap.xml`) then use your site's address.
Everything a help page loads from the install is under `/help` too (its scripts and styles under
`/help/_assets`, collection icons under `/help/_icons`), so the one rule is enough; the chat and
"Chat with us" open on the install's own address. [`examples/nextjs`](../examples/nextjs) does
this, and its tests check it.

## Upgrading

```bash
pnpm helpwren upgrade --dry-run     # see what would happen; changes nothing
pnpm helpwren upgrade
```

It:

1. pulls the new version with a fast-forward `git pull` (`--no-pull` uses what is checked out),
   refusing if you have uncommitted changes, then runs `pnpm install`;
2. lists the migrations the database has not had (`supabase db push --dry-run`);
3. asks to back up the database first and, with your yes, saves a `pg_dump` to
   `.helpwren/backups/` (Docker: from the `db` container; Cloud: needs `pg_dump` on your
   machine, otherwise it reminds you to check the project's backups);
4. applies the migrations;
5. rebuilds: Docker rebuilds and restarts the app and scheduler containers; on Cloud it runs
   `pnpm build`, and you redeploy (Vercel deploys on every push).

`/api/health` then shows `"migrations": "current"` when the database has every migration the
running build expects, and `"pending"` when it does not.

Moving the self-hosted **Supabase** stack to a new release is a separate, deliberate step: read
its [changelog](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md), change
`SUPABASE_SELF_HOSTED_REF` in `packages/cli/src/docker.ts`, move `deploy/docker/supabase`
aside and run `pnpm helpwren install --mode docker` again. Data lives in named volumes, so the
fetch never touches it.

## Rolling back

Migrations only move forward, so rolling back means restoring the backup taken before the
upgrade, then running the older code.

1. **Stop traffic**: stop the app (`docker compose stop helpwren scheduler`, or pause the
   deployment).
2. **Restore the database** from the backup the upgrade printed:

   ```bash
   # Docker
   docker compose exec -T db pg_restore --username=postgres --dbname=postgres --clean --if-exists \
     < ../../.helpwren/backups/helpwren-<time>.dump
   # Supabase Cloud: from the dashboard's Database → Backups, or
   pg_restore --clean --if-exists --no-owner --dbname="$SUPABASE_DB_URL" .helpwren/backups/helpwren-<time>.dump
   ```

3. **Go back to the old code**: `git checkout <previous tag or commit>`, then
   `docker compose up --detach --build helpwren scheduler`, or redeploy that commit on your host.

## How long it takes

Timed on 19 November 2026 on an Apple Silicon laptop, against a fresh, empty Supabase project
run locally on separate ports in place of a Cloud project, from a clean copy of the repository:

| Step                                              | Time       |
| ------------------------------------------------- | ---------- |
| Start an empty Supabase project (local stand-in)  | 15 to 23 s |
| `pnpm install` (packages already in pnpm's store) | 4 s        |
| `pnpm helpwren install` (30 migrations)           | 4 to 7 s   |
| `pnpm build`                                      | 22 to 31 s |
| Start, until `/api/health` answers                | under 1 s  |
| The setup wizard, driven by its end-to-end test   | 6 s        |

Not measured: creating a real Cloud project (Supabase says about two minutes), a first
`pnpm install` with an empty store (about a minute on a fast connection), Vercel's build, and a
person reading and typing. With those, ten minutes is a fair target for the Cloud path.

The Docker path on the same laptop, all fourteen containers healthy at the end:

| Step                                                         | Time  |
| ------------------------------------------------------------ | ----- |
| `docker compose pull` (Supabase's images, a few GB)          | 6 min |
| `pnpm helpwren install --mode docker`, images already pulled | 63 s  |
| Running it again (nothing to do but rebuild the app image)   | 45 s  |
| `pnpm helpwren upgrade` with one migration and a backup      | 48 s  |
| The setup wizard's end-to-end test against it                | 9 s   |

The whole stack used about 1.5 GB of memory once running.

## Troubleshooting

**"Supabase CLI: not found"**: run `pnpm install` at the repository's root; the CLI is a dev
dependency.

**The migrations fail with "password authentication failed"**: the connection string still says
`[YOUR-PASSWORD]`, or the password has characters that need escaping in a URL. Reset it under
**Project Settings → Database**, or percent-encode it.

**"The Supabase CLI could not apply the migrations" mentioning a migration that already exists**:
the database was changed by hand. `supabase migration list --remote=<url>` shows what it has;
never reset a production database to fix this. Open an issue with the output.

**No sign-in code arrives**: on Supabase Cloud, the built-in email only reaches members of your
Supabase organisation, a few an hour; set up SMTP (step 3). Self-hosted: check `SMTP_*` in
`deploy/docker/.env`, or the test mailbox at http://localhost:8025, and
`docker compose logs auth`. The wizard's "Send a new code" shows Supabase's own error.

**The code email has a link instead of a code**: the magic link template was not changed (step
3, point 2).

**The chat says it cannot start**: anonymous sign-ins are off (step 3, point 1).

**`/setup` sends me to the sign-in page**: someone is already on the team. Sign in as them, or
ask an admin to add you.

**The widget check stays on "Waiting"**: open a page of your site that has the snippet, in a
fresh tab (the browser keeps the widget's settings for a minute). Allowed domains, if set, must
include your site. The check needs the site on another address than Helpwren itself.

**`docker compose` says `include` is not supported**: update Docker; Compose 2.20 or later is
needed.

**The Helpwren container is unhealthy**: `docker compose logs helpwren`. A message naming an
environment variable means `.env` is missing it; `/api/health` answering 503 means the database
cannot be reached.

**Port already in use**: change `HELPWREN_PORT` (Helpwren), `API_GW_HTTP_PORT` (Supabase) or
`POSTGRES_PORT` in `deploy/docker/.env`. `POSTGRES_PORT` is also the database's internal port.

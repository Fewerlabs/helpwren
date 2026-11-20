# Docker Compose

Run Helpwren, Supabase's own self-hosting stack and a scheduler together on one server.

`deploy/docker/docker-compose.yml` includes Supabase's official Compose file
([docs](https://supabase.com/docs/guides/self-hosting/docker)), fetched unchanged at a pinned
release (`self-hosted/v0.8.4`) into `deploy/docker/supabase`.
[`deploy/docker/supabase-overrides.yml`](../../deploy/docker/supabase-overrides.yml) adds what
Helpwren needs on top: the sign-in code email, named volumes for the database and uploads, and an
optional test mailbox. A small scheduler container calls the
[scheduled jobs](../operations/scheduled-jobs.md) every minute.

## Before you start

- A Linux server with 4 GB of memory or more. The stack is about a dozen containers and uses
  about 1.5 GB once running; check Supabase's guide for its current requirements.
- Docker with Compose 2.20 or later, Git, Node 26 and pnpm 12.
- For real use, a domain and an SMTP service for sign-in emails.

## Install

1. Clone the repository and run the installer in Docker mode:

   ```bash title="Terminal"
   git clone https://github.com/Fewerlabs/helpwren.git && cd helpwren
   pnpm install
   pnpm helpwren install --mode docker
   ```

2. Answer whether to catch sign-in emails in a local test mailbox. Say yes to try Helpwren out;
   for real use, say no and set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
   `SMTP_ADMIN_EMAIL` in `deploy/docker/.env` to a real mail service.
3. When the installer finishes, open http://localhost:3000/setup and follow
   [the setup wizard](setup-wizard.md).

The installer:

1. checks that Docker is running, that Compose is 2.20 or later (for `include`), and Git;
2. fetches Supabase's `docker/` folder at the pinned release, with a sparse Git checkout;
3. writes `deploy/docker/.env` from Supabase's `.env.example`, replacing every published example
   secret with a fresh one (`POSTGRES_PASSWORD`, `JWT_SECRET`, the API keys signed with it, the
   dashboard password and the rest), and adds Helpwren's own `HELPWREN_APP_URL` and
   `CRON_SECRET`. Values you have already set are kept;
4. starts the database, applies the migrations through Supabase's pooler, then builds the
   Helpwren image and starts everything with `docker compose up --wait`.

`--no-start` writes the files and stops, so you can review `.env` first. Most of the first run
is Docker pulling Supabase's images, a few gigabytes.

| What                 | Where                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Helpwren             | http://localhost:3000 (`HELPWREN_PORT` to change)                  |
| Supabase API, Studio | http://localhost:8000 (user and password: `DASHBOARD_*` in `.env`) |
| Test mailbox         | http://localhost:8025, when chosen                                 |
| Database volume      | `helpwren_db-data`; uploads in `helpwren_storage-data`             |

## Serve it on a domain

1. Put a reverse proxy with TLS in front of ports 3000 and 8000. Supabase's docs cover
   [Caddy and nginx](https://supabase.com/docs/guides/self-hosting/docker).
2. Give the installer the public addresses:

   ```bash title="Terminal"
   pnpm helpwren install --mode docker \
     --app-url https://support.example.com --supabase-url https://api.support.example.com
   ```

The app reaches Supabase over the private Docker network (`SUPABASE_INTERNAL_URL` is
`http://kong:8000`), so it works whether or not the public address resolves from inside a
container.

## Send email from Helpwren

Reply notifications are separate from Supabase Auth's sign-in emails. Set `EMAIL_PROVIDER` and
`HELPWREN_SMTP_URL` (or `RESEND_API_KEY`) in `deploy/docker/.env`, then run
`docker compose up --detach helpwren`. See [Sending email](../email/index.md).

## Run the pieces yourself

```bash title="deploy/docker"
docker compose config --quiet          # check the configuration
docker compose up --detach --build     # start or update everything
docker compose logs --follow helpwren scheduler
```

The image is built from [`apps/web/Dockerfile`](../../apps/web/Dockerfile): a multi-stage build
on `node:26-alpine` that ships only Next's standalone server, runs as the unprivileged `node`
user, and reports its health from [`/api/health`](../operations/health-check.md).

# 0024: The installer, the upgrader and the setup wizard

- **Status:** accepted
- **Date:** 2026-11-19

## Context

The plan's target is about ten minutes from nothing to a working chat. Until now an install
meant copying `.env.example`, applying migrations by hand, setting Supabase Auth up to send codes
and allow guests, and adding the first admin with `pnpm agent:invite`. ADR 0007 already noted
that hosted projects would need the sign-in email and code length applied by an installer.
Self-hosting with no outside services had no path at all.

## Decision

- **Two supported ways to run it.** Supabase Cloud with any Node host (Vercel first) is the
  recommended path. Fully self-hosted runs on Docker Compose. Nothing else is documented as
  supported, so there is less to test and less to go stale.
- **One command, `pnpm helpwren install`, from a checkout.** It lives in `packages/cli`, runs
  on Node directly from TypeScript with no build step, and takes its answers from prompts, or
  from flags and environment variables with `--yes` for CI. Every flow takes its programs,
  prompts, output and clock as arguments, so the tests run the real flows with stand-ins.
- **Running it again is always safe.** A value already in the env file is kept unless
  `--overwrite` is given; generated secrets (`CRON_SECRET`, and Supabase's for Docker) are never
  replaced, because something already uses them; migrations go through `supabase db push`,
  which only adds what is missing. Nothing in the installer resets or deletes data. Secrets are
  written to files only their owner can read and are never printed.
- **Migrations by the Supabase CLI, never the seed.** `db push --remote=<url>` with the
  project's pooler address, or `--remote` after `supabase link`. The demo data loads only when
  asked, and is off by default.
- **Supabase Auth settings through the Management API when given a token**: anonymous sign-ins
  on, the code email and its length, and the Site URL. Without a token the installer lists the
  three settings to make by hand. Pasting a personal access token is optional because many will
  not want to hand one over.
- **Docker uses Supabase's own Compose file, unchanged.** It is fetched at a pinned release
  (`self-hosted/v0.8.4`) and included from `deploy/docker/docker-compose.yml`; a small override
  file adds the code email, named volumes for the database and uploads, and an optional Mailpit.
  Vendoring a copy would leave Helpwren maintaining Supabase's stack; writing our own would be
  worse. The installer generates every secret Supabase's `generate-keys.sh` does.
- **The app reaches self-hosted Supabase on the private network.** A new optional
  `SUPABASE_INTERNAL_URL` is used by the server's Supabase clients, while the session cookie
  keeps the name the public address gives it, so the browser and the server still share one
  session. In a container, the public address can point back at the container itself.
- **A scheduler container** calls the two jobs every minute on Docker. It is a shell loop in a
  pinned Alpine image: nothing to install, and its log shows each failed run. On Vercel, Cron
  Jobs call with `GET` and only daily on the free plan, so the docs point to another scheduler.
- **The image is Next's standalone server** on `node:26-alpine`, multi-stage, as the `node`
  user, with a health check. `output: "standalone"` is switched on only when the Dockerfile asks
  (`HELPWREN_STANDALONE=1`), so other hosts build as before. `NEXT_PUBLIC_` values are build
  arguments, so an image belongs to one install; Compose passes them from `.env`.
- **`pnpm helpwren upgrade`** fast-forwards the checkout, lists the migrations waiting, offers
  a `pg_dump` first, applies them and rebuilds. `--dry-run` changes nothing. Rolling back is
  restoring that backup and running the older code, because migrations only move forward.
- **The wizard at `/setup` creates the first admin**, then asks for the brand, email and the
  widget, each skippable. It opens only while nobody is on the team. The first admin is made by
  `create_first_admin`, which locks `agents`, checks it is empty and inserts, so two people
  setting up at the same moment cannot both win; the loser's new account is deleted again.
  `install_status` records when the wizard was finished or skipped, after which `/setup` sends
  everyone to the dashboard. An admin who closes the tab before signing in can sign in at
  `/setup` and carry on.
- **The live install check** reads the `Origin` of the widget's first request, `GET
/api/widget`, after the answer is sent. The database writes at most once a minute per site.
  The origin is shown, never trusted: anyone can send a request with any origin.
- **`/api/health`** reports the database, the newest migration it has against the newest this
  build was made with, and the build's version and commit. It is public, so it says nothing
  that helps an attacker beyond the version: no addresses, keys or counts.

## Consequences

- Until the first admin is created, anyone who can reach `/setup` can become it. The docs say
  to do it straight after deploying. A setup token printed by the installer would close the
  window; it was left out to keep the first run to one screen.
- The Cloud path still needs a person in the Supabase and Vercel dashboards: creating the
  project, copying keys, and SMTP for sign-in codes beyond Supabase's built-in sender.
- An image cannot be shared between installs, because the public values are built in. A
  published image would need the browser to read them at run time.
- Moving the self-hosted Supabase stack to a new release is a manual, deliberate step.
- The database URL the installer is given contains a password and is passed to the Supabase
  CLI as an argument, where other users of the same machine could see it in the process list
  while it runs.

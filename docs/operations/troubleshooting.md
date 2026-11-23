# Troubleshooting

Fixes for the problems people meet most often when installing and running Helpwren.

## Installing

**"Supabase CLI: not found".** Run `pnpm install` at the repository's root; the CLI is a dev
dependency.

**The migrations fail with "password authentication failed".** The connection string still says
`[YOUR-PASSWORD]`, or the password has characters that need escaping in a URL. Reset it under
**Project Settings → Database**, or percent-encode it.

**"The Supabase CLI could not apply the migrations", naming a migration that already exists.**
The database was changed by hand. `supabase migration list --remote=<url>` shows what it has.
Never reset a production database to fix this; open an issue with the output.

**`docker compose` says `include` is not supported.** Update Docker; Compose 2.20 or later is
needed.

**Port already in use.** Change `HELPWREN_PORT` (Helpwren), `API_GW_HTTP_PORT` (Supabase) or
`POSTGRES_PORT` in `deploy/docker/.env`. `POSTGRES_PORT` is also the database's internal port.

## Signing in

**No sign-in code arrives.** Sign in with a password instead, if you have one; an admin can set
one under **Settings → Team**. On Supabase Cloud, the built-in email reaches only members of your
Supabase organisation, a few an hour; set up SMTP (see
[Configure Auth](../get-started/supabase-cloud.md#configure-auth)). With Docker, check `SMTP_*` in
`deploy/docker/.env`, or the test mailbox at http://localhost:8025, and
`docker compose logs auth`.

**The email has a link instead of a code.** The magic link template was not changed. Run
`pnpm helpwren auth`, or see [Configure Auth](../get-started/supabase-cloud.md#configure-auth).

**`/setup` sends me to the sign-in page.** Someone is already on the team. Sign in as them, or ask
an admin to invite you.

## The chat

**The chat says it cannot start.** Anonymous sign-ins are off in Supabase. See
[Configure Auth](../get-started/supabase-cloud.md#configure-auth), step 1.

**The chat opens empty on my site.** Open the browser's console. A Content Security Policy error
about `frame-ancestors` means the site is not in your
[allowed domains](../security/allowed-domains.md).

**The live check stays on "Waiting".** Open a page of your site that has the snippet, in a fresh
tab; the browser keeps the widget's settings for a minute. Allowed domains, if set, must include
your site. The check needs the site to be on another address than the install itself.

**Emails or pushes are never sent.** The [scheduled jobs](scheduled-jobs.md) are not being
called, or `CRON_SECRET` differs between the app and the scheduler. Call a job by hand and read
its answer.

## Running

**The Helpwren container is unhealthy.** Run `docker compose logs helpwren`. A message naming an
environment variable means `.env` is missing it; [`/api/health`](health-check.md) answering
`503` means the database cannot be reached.

**`/api/health` says `"migrations": "pending"`.** The build is newer than the database. Run
`pnpm helpwren upgrade`, or apply the migrations with `supabase db push`.

Still stuck? [Open an issue](https://github.com/Fewerlabs/helpwren/issues) with what you ran and
what it printed, without secrets.
